import * as zmq from 'zeromq';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Logger } from 'pino';
import { ZMQProtocolError, ZMQTimeoutError } from '@xiaoy/zmq-protocol';
import { PythonShell } from 'python-shell';
import * as path from 'path';

interface ZMQRequest {
  id: string;
  service: string;
  method: string;
  args: any[];
  kwargs: Record<string, any>;
  timestamp: number;
  retries: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface ZMQClientConfig {
  brokerUrl: string;
  timeout: number;
  retries: number;
  heartbeatInterval: number;
  pythonPath?: string;
  pythonScriptPath?: string;
  verbose?: boolean;
}

// Majordomo Protocol constants
const MDP = {
  C_CLIENT: Buffer.from('MDPC01'),
  W_WORKER: Buffer.from('MDPW01'),
  W_READY: Buffer.from('\x01'),
  W_REQUEST: Buffer.from('\x02'),
  W_REPLY: Buffer.from('\x03'),
  W_HEARTBEAT: Buffer.from('\x04'),
  W_DISCONNECT: Buffer.from('\x05'),
};

export class ZMQClientManager extends EventEmitter {
  private client: zmq.Dealer | null = null;
  private requests: Map<string, ZMQRequest> = new Map();
  private connected: boolean = false;
  private active: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private requestQueue: Array<Buffer[]> = [];
  private config: ZMQClientConfig;
  private logger: Logger;
  private receiveLoop: Promise<void> | null = null;
  private processLoop: Promise<void> | null = null;

  constructor(config: ZMQClientConfig, logger: Logger) {
    super();
    this.config = {
      pythonPath: 'python3',
      pythonScriptPath: path.join(__dirname, '../../python-scripts'),
      ...config,
    };
    this.logger = logger.child({ component: 'ZMQClientManager' });
  }

  async start(): Promise<void> {
    try {
      this.active = true;
      await this.reconnectToBroker();
      this.startHeartbeat();
      this.startRequestProcessor();
      this.logger.info('ZMQ Client Manager started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start ZMQ client');
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reject all pending requests
    for (const [id, request] of this.requests) {
      request.reject(new ZMQProtocolError('Client shutting down', 'CLIENT_SHUTDOWN'));
    }
    this.requests.clear();
    this.requestQueue = [];

    // Stop receive loop
    if (this.receiveLoop) {
      await this.receiveLoop;
      this.receiveLoop = null;
    }

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    this.connected = false;
    this.logger.info('ZMQ Client Manager stopped');
  }

  /**
   * Make an RPC call to a service
   * @param service Service name (e.g., 'auth_service', 'account_service')
   * @param method Method name to call
   * @param args Positional arguments
   * @param kwargs Keyword arguments
   */
  async call(
    service: string, 
    method: string, 
    args: any[] = [], 
    kwargs: Record<string, any> = {}
  ): Promise<any> {
    if (!this.active) {
      throw new ZMQProtocolError('Client is not active', 'CLIENT_INACTIVE');
    }

    const requestId = uuidv4();
    
    return new Promise((resolve, reject) => {
      const request: ZMQRequest = {
        id: requestId,
        service,
        method,
        args,
        kwargs,
        timestamp: Date.now(),
        retries: 0,
        resolve,
        reject,
      };

      this.requests.set(requestId, request);
      
      // Send the request
      this.sendRequest(request).catch(error => {
        this.requests.delete(requestId);
        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        if (this.requests.has(requestId)) {
          this.requests.delete(requestId);
          reject(new ZMQTimeoutError(requestId, this.config.timeout));
        }
      }, this.config.timeout);
    });
  }

  private async reconnectToBroker(): Promise<void> {
    if (this.client) {
      this.client.close();
    }

    this.client = new zmq.Dealer();
    await this.client.connect(this.config.brokerUrl);
    
    this.logger.info({ brokerUrl: this.config.brokerUrl }, 'Connected to ZMQ broker');
    this.connected = true;
    this.emit('connected');

    // Start receive loop
    this.receiveLoop = this.receiveMessages();
  }

  private async receiveMessages(): Promise<void> {
    if (!this.client) return;

    try {
      for await (const msg of this.client) {
        if (!this.active) break;
        
        try {
          await this.processMessage(msg);
        } catch (error) {
          this.logger.error({ error }, 'Error processing message');
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Receive loop error');
      if (this.active) {
        this.connected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      }
    }
  }

  private async processMessage(msg: Buffer[]): Promise<void> {
    if (this.config.verbose) {
      this.logger.debug({ frames: msg.length }, 'Received message');
    }

    // Handle heartbeat messages
    if (msg.length === 2 && msg[1].equals(MDP.W_HEARTBEAT)) {
      this.emit('heartbeat');
      return;
    }

    if (msg.length < 5) {
      this.logger.warn({ msgLength: msg.length }, 'Invalid message format');
      return;
    }

    // Parse Majordomo protocol message
    // Format: [empty, header, service, requestId, reply_data]
    const empty = msg[0];
    const header = msg[1];
    const service = msg[2];
    const requestId = msg[3].toString();
    const replyData = msg[4];

    if (!header.equals(MDP.C_CLIENT)) {
      this.logger.warn({ header: header.toString() }, 'Invalid protocol header');
      return;
    }

    const request = this.requests.get(requestId);
    if (!request) {
      this.logger.warn({ requestId }, 'Received reply for unknown request');
      return;
    }

    this.requests.delete(requestId);

    // Deserialize the pickle reply
    try {
      const result = await this.deserializePickle(replyData);
      
      // The result should be [success, data] based on the Python RpcWorker implementation
      if (Array.isArray(result) && result.length === 2) {
        const [success, data] = result;
        if (success) {
          request.resolve(data);
        } else {
          request.reject(new ZMQProtocolError(`RPC call failed: ${data}`, 'RPC_FAILED'));
        }
      } else {
        request.resolve(result);
      }
    } catch (error) {
      request.reject(new ZMQProtocolError('Failed to deserialize reply', 'DESERIALIZATION_ERROR', error));
    }
  }

  private async sendRequest(request: ZMQRequest): Promise<void> {
    if (!this.client || !this.connected) {
      throw new ZMQProtocolError('Not connected to broker', 'NOT_CONNECTED');
    }

    // Build the request payload following the Python RpcClient format
    // req = [method_name, args, kwargs]
    const requestPayload = [request.method, request.args, request.kwargs];
    const serializedPayload = await this.serializePickle(requestPayload);

    // Build Majordomo protocol message
    // Format: [empty, header, service, requestId, request_data]
    const message = [
      Buffer.alloc(0), // empty frame
      MDP.C_CLIENT,
      Buffer.from(request.service),
      Buffer.from(request.id),
      serializedPayload,
    ];

    // Queue the message
    this.requestQueue.push(message);
    
    // Process queue
    await this.processRequestQueue();
  }

  private async processRequestQueue(): Promise<void> {
    if (!this.client || !this.connected) return;

    while (this.requestQueue.length > 0) {
      const message = this.requestQueue.shift()!;
      try {
        await this.client.send(message);
        
        if (this.config.verbose) {
          const requestId = message[3].toString();
          const service = message[2].toString();
          this.logger.debug({ requestId, service }, 'Sent request');
        }
      } catch (error) {
        // Put the message back in the queue for retry
        this.requestQueue.unshift(message);
        throw error;
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.active) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.reconnectToBroker();
        
        // Resend pending requests
        for (const request of this.requests.values()) {
          await this.sendRequest(request).catch(error => {
            this.logger.error({ error, requestId: request.id }, 'Failed to resend request');
          });
        }
      } catch (error) {
        this.logger.error({ error }, 'Reconnection failed');
        if (this.active) {
          this.scheduleReconnect();
        }
      }
    }, 1000);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.client && this.active) {
        try {
          // Send heartbeat to broker (not implemented in Python client, but good practice)
          const heartbeat = [
            Buffer.alloc(0),
            MDP.W_HEARTBEAT,
          ];
          this.client.send(heartbeat).catch(error => {
            this.logger.error({ error }, 'Failed to send heartbeat');
          });
        } catch (error) {
          this.logger.error({ error }, 'Heartbeat error');
        }
      }
    }, this.config.heartbeatInterval);
  }

  private startRequestProcessor(): void {
    // Clean up timed out requests periodically
    setInterval(() => {
      if (!this.active) return;
      
      const now = Date.now();
      for (const [id, request] of this.requests) {
        if (now - request.timestamp > this.config.timeout) {
          this.requests.delete(id);
          request.reject(new ZMQTimeoutError(id, this.config.timeout));
        }
      }
    }, 1000);
  }

  /**
   * Serialize data using Python pickle
   */
  private async serializePickle(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'binary' as any,
        pythonPath: this.config.pythonPath,
        pythonOptions: ['-u'],
        scriptPath: this.config.pythonScriptPath,
        args: ['serialize'],
      };

      const pyshell = new PythonShell('pickle_helper.py', options);
      
      // Send JSON data to Python
      pyshell.send(JSON.stringify(data));
      
      let result: Buffer | null = null;
      
      pyshell.on('message', (message: Buffer) => {
        result = message;
      });
      
      pyshell.end((err) => {
        if (err) {
          reject(new Error(`Pickle serialization failed: ${err.message}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('No data received from pickle serialization'));
        }
      });
    });
  }

  /**
   * Deserialize pickle data using Python
   */
  private async deserializePickle(data: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'json' as any,
        pythonPath: this.config.pythonPath,
        pythonOptions: ['-u'],
        scriptPath: this.config.pythonScriptPath,
        args: ['deserialize'],
      };

      const pyshell = new PythonShell('pickle_helper.py', options);
      
      // Send binary data to Python
      pyshell.send(data as any);
      
      let result: any = null;
      
      pyshell.on('message', (message: any) => {
        result = message;
      });
      
      pyshell.end((err) => {
        if (err) {
          reject(new Error(`Pickle deserialization failed: ${err.message}`));
        } else if (result !== null) {
          resolve(result);
        } else {
          reject(new Error('No data received from pickle deserialization'));
        }
      });
    });
  }

  // Public methods for monitoring
  isConnected(): boolean {
    return this.connected;
  }

  isActive(): boolean {
    return this.active;
  }

  getPendingRequestCount(): number {
    return this.requests.size;
  }

  getQueuedRequestCount(): number {
    return this.requestQueue.length;
  }

  getMetrics() {
    return {
      active: this.active,
      connected: this.connected,
      pendingRequests: this.requests.size,
      queuedRequests: this.requestQueue.length,
      brokerUrl: this.config.brokerUrl,
    };
  }
}