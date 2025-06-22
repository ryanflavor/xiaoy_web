import * as zmq from 'zeromq';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

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

export abstract class BaseMockWorker {
  protected socket: zmq.Dealer | null = null;
  protected logger: Logger;
  protected running: boolean = false;
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  protected serviceName: string;
  protected brokerUrl: string;

  constructor(serviceName: string, brokerUrl: string, logger: Logger) {
    this.serviceName = serviceName;
    this.brokerUrl = brokerUrl;
    this.logger = logger.child({ component: `Mock${serviceName}Worker` });
  }

  async start(): Promise<void> {
    try {
      // Create dealer socket
      this.socket = new zmq.Dealer();
      this.socket.connect(this.brokerUrl);
      
      this.running = true;
      
      // Send READY to broker
      await this.sendToBroker(MDP.W_READY, Buffer.from(this.serviceName));
      
      this.logger.info({ service: this.serviceName, broker: this.brokerUrl }, 'Mock worker started');
      
      // Start processing messages
      this.processMessages();
      
      // Start heartbeat
      this.startHeartbeat();
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to start mock worker');
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.socket) {
      // Send disconnect
      await this.sendToBroker(MDP.W_DISCONNECT);
      this.socket.close();
      this.socket = null;
    }
    
    this.logger.info('Mock worker stopped');
  }

  private async processMessages(): Promise<void> {
    if (!this.socket) return;
    
    try {
      for await (const frames of this.socket) {
        if (!this.running) break;
        
        try {
          await this.handleMessage(frames);
        } catch (error) {
          this.logger.error({ error }, 'Error handling message');
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Socket receive error');
    }
  }

  private async handleMessage(frames: Buffer[]): Promise<void> {
    if (frames.length < 3) {
      this.logger.warn({ frameCount: frames.length }, 'Invalid message format');
      return;
    }
    
    const empty = frames[0];
    const header = frames[1];
    const command = frames[2];
    
    if (!header.equals(MDP.W_WORKER)) {
      this.logger.warn({ header: header.toString() }, 'Invalid protocol header');
      return;
    }
    
    if (command.equals(MDP.W_REQUEST)) {
      await this.handleRequest(frames.slice(3));
    } else if (command.equals(MDP.W_HEARTBEAT)) {
      // Heartbeat received, no action needed
      this.logger.debug('Heartbeat received from broker');
    } else if (command.equals(MDP.W_DISCONNECT)) {
      this.logger.info('Disconnect received from broker');
      await this.stop();
    } else {
      this.logger.warn({ command: command.toString() }, 'Unknown command');
    }
  }

  private async handleRequest(frames: Buffer[]): Promise<void> {
    if (frames.length < 3) {
      this.logger.warn('Invalid request format');
      return;
    }
    
    const clientId = frames[0];
    const requestId = frames[1];
    const requestData = frames[2];
    
    try {
      // Deserialize request (simulate pickle deserialization)
      const request = JSON.parse(requestData.toString());
      const [method, args, kwargs] = request;
      
      this.logger.debug({ method, args, kwargs }, 'Processing request');
      
      // Call the service method
      const result = await this.handleServiceCall(method, args, kwargs);
      
      // Serialize response (simulate pickle serialization)
      const response = JSON.stringify([true, result]);
      
      // Send reply
      await this.sendToBroker(
        MDP.W_REPLY,
        clientId,
        requestId,
        Buffer.from(response)
      );
      
    } catch (error) {
      this.logger.error({ error }, 'Request processing failed');
      
      // Send error response
      const errorResponse = JSON.stringify([
        false,
        error instanceof Error ? error.message : 'Unknown error'
      ]);
      
      await this.sendToBroker(
        MDP.W_REPLY,
        clientId,
        requestId,
        Buffer.from(errorResponse)
      );
    }
  }

  private async sendToBroker(...frames: Buffer[]): Promise<void> {
    if (!this.socket) return;
    
    const message = [
      Buffer.alloc(0), // empty frame
      MDP.W_WORKER,
      ...frames,
    ];
    
    await this.socket.send(message);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.running && this.socket) {
        await this.sendToBroker(MDP.W_HEARTBEAT);
      }
    }, 2500);
  }

  /**
   * Handle service-specific method calls
   * Must be implemented by subclasses
   */
  protected abstract handleServiceCall(
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<any>;
}