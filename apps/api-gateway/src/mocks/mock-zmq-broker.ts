import * as zmq from 'zeromq';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

interface Worker {
  id: string;
  service: string;
  socket: zmq.Router;
  lastHeartbeat: number;
}

interface PendingRequest {
  client: string;
  requestId: string;
  service: string;
  timestamp: number;
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

export class MockZMQBroker extends EventEmitter {
  private router: zmq.Router | null = null;
  private publisher: zmq.Publisher | null = null;
  private workers: Map<string, Worker> = new Map();
  private serviceWorkers: Map<string, string[]> = new Map();
  private pendingRequests: PendingRequest[] = [];
  private logger: Logger;
  private running: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private routerUrl: string = 'tcp://localhost:5555',
    private pubUrl: string = 'tcp://localhost:5556',
    logger: Logger
  ) {
    super();
    this.logger = logger.child({ component: 'MockZMQBroker' });
  }

  async start(): Promise<void> {
    try {
      // Create router socket for client/worker communication
      this.router = new zmq.Router();
      await this.router.bind(this.routerUrl);
      
      // Create publisher socket for pub/sub
      this.publisher = new zmq.Publisher();
      await this.publisher.bind(this.pubUrl);
      
      this.running = true;
      this.logger.info({ routerUrl: this.routerUrl, pubUrl: this.pubUrl }, 'Mock ZMQ broker started');
      
      // Start processing messages
      this.processMessages();
      
      // Start heartbeat timer
      this.startHeartbeat();
      
      // Start mock workers
      await this.startMockWorkers();
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to start mock broker');
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Disconnect all workers
    for (const worker of this.workers.values()) {
      await this.sendToWorker(worker, MDP.W_DISCONNECT);
    }
    this.workers.clear();
    this.serviceWorkers.clear();
    
    if (this.router) {
      this.router.close();
      this.router = null;
    }
    
    if (this.publisher) {
      this.publisher.close();
      this.publisher = null;
    }
    
    this.logger.info('Mock ZMQ broker stopped');
  }

  private async processMessages(): Promise<void> {
    if (!this.router) return;
    
    try {
      for await (const frames of this.router) {
        if (!this.running) break;
        
        try {
          await this.handleMessage(frames);
        } catch (error) {
          this.logger.error({ error }, 'Error handling message');
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Router receive error');
    }
  }

  private async handleMessage(frames: Buffer[]): Promise<void> {
    if (frames.length < 3) {
      this.logger.warn({ frameCount: frames.length }, 'Invalid message format');
      return;
    }
    
    const sender = frames[0];
    const empty = frames[1];
    const header = frames[2];
    
    // Check if it's a client or worker message
    if (header.equals(MDP.C_CLIENT)) {
      await this.handleClientMessage(sender, frames.slice(3));
    } else if (header.equals(MDP.W_WORKER)) {
      await this.handleWorkerMessage(sender, frames.slice(3));
    } else {
      this.logger.warn({ header: header.toString() }, 'Unknown protocol header');
    }
  }

  private async handleClientMessage(clientId: Buffer, frames: Buffer[]): Promise<void> {
    if (frames.length < 2) {
      this.logger.warn('Invalid client message format');
      return;
    }
    
    const service = frames[0].toString();
    const requestId = frames[1];
    const request = frames.slice(2);
    
    this.logger.debug({ clientId: clientId.toString(), service, requestId: requestId.toString() }, 'Client request received');
    
    // Find available worker for the service
    const workerId = this.getAvailableWorker(service);
    
    if (workerId) {
      const worker = this.workers.get(workerId);
      if (worker) {
        // Forward request to worker
        await this.sendToWorker(worker, MDP.W_REQUEST, clientId, requestId, ...request);
      }
    } else {
      // Queue the request
      this.pendingRequests.push({
        client: clientId.toString(),
        requestId: requestId.toString(),
        service,
        timestamp: Date.now(),
      });
      
      this.logger.warn({ service }, 'No workers available, request queued');
    }
  }

  private async handleWorkerMessage(workerId: Buffer, frames: Buffer[]): Promise<void> {
    if (frames.length < 1) {
      this.logger.warn('Invalid worker message format');
      return;
    }
    
    const command = frames[0];
    
    if (command.equals(MDP.W_READY)) {
      await this.handleWorkerReady(workerId, frames.slice(1));
    } else if (command.equals(MDP.W_REPLY)) {
      await this.handleWorkerReply(workerId, frames.slice(1));
    } else if (command.equals(MDP.W_HEARTBEAT)) {
      await this.handleWorkerHeartbeat(workerId);
    } else if (command.equals(MDP.W_DISCONNECT)) {
      await this.handleWorkerDisconnect(workerId);
    } else {
      this.logger.warn({ command: command.toString() }, 'Unknown worker command');
    }
  }

  private async handleWorkerReady(workerId: Buffer, frames: Buffer[]): Promise<void> {
    if (frames.length < 1) {
      this.logger.warn('Worker ready without service name');
      return;
    }
    
    const service = frames[0].toString();
    const workerIdStr = workerId.toString();
    
    // Register worker
    this.workers.set(workerIdStr, {
      id: workerIdStr,
      service,
      socket: this.router!,
      lastHeartbeat: Date.now(),
    });
    
    // Add to service workers
    if (!this.serviceWorkers.has(service)) {
      this.serviceWorkers.set(service, []);
    }
    this.serviceWorkers.get(service)!.push(workerIdStr);
    
    this.logger.info({ workerId: workerIdStr, service }, 'Worker registered');
    
    // Check for pending requests
    await this.processPendingRequests(service);
  }

  private async handleWorkerReply(workerId: Buffer, frames: Buffer[]): Promise<void> {
    if (frames.length < 3) {
      this.logger.warn('Invalid worker reply format');
      return;
    }
    
    const clientId = frames[0];
    const requestId = frames[1];
    const reply = frames.slice(2);
    
    // Update worker heartbeat
    const workerIdStr = workerId.toString();
    const worker = this.workers.get(workerIdStr);
    if (worker) {
      worker.lastHeartbeat = Date.now();
    }
    
    // Forward reply to client
    await this.sendToClient(clientId, worker?.service || '', requestId, ...reply);
    
    // Process more pending requests
    if (worker) {
      await this.processPendingRequests(worker.service);
    }
  }

  private async handleWorkerHeartbeat(workerId: Buffer): Promise<void> {
    const workerIdStr = workerId.toString();
    const worker = this.workers.get(workerIdStr);
    
    if (worker) {
      worker.lastHeartbeat = Date.now();
      this.logger.debug({ workerId: workerIdStr }, 'Worker heartbeat received');
    }
  }

  private async handleWorkerDisconnect(workerId: Buffer): Promise<void> {
    const workerIdStr = workerId.toString();
    const worker = this.workers.get(workerIdStr);
    
    if (worker) {
      // Remove from service workers
      const serviceWorkers = this.serviceWorkers.get(worker.service);
      if (serviceWorkers) {
        const index = serviceWorkers.indexOf(workerIdStr);
        if (index > -1) {
          serviceWorkers.splice(index, 1);
        }
      }
      
      // Remove worker
      this.workers.delete(workerIdStr);
      
      this.logger.info({ workerId: workerIdStr, service: worker.service }, 'Worker disconnected');
    }
  }

  private async sendToWorker(worker: Worker, command: Buffer, ...frames: Buffer[]): Promise<void> {
    if (!this.router) return;
    
    const message = [
      Buffer.from(worker.id),
      Buffer.alloc(0),
      MDP.W_WORKER,
      command,
      ...frames,
    ];
    
    await this.router.send(message);
  }

  private async sendToClient(clientId: Buffer, service: string, ...frames: Buffer[]): Promise<void> {
    if (!this.router) return;
    
    const message = [
      clientId,
      Buffer.alloc(0),
      MDP.C_CLIENT,
      Buffer.from(service),
      ...frames,
    ];
    
    await this.router.send(message);
  }

  private getAvailableWorker(service: string): string | null {
    const workers = this.serviceWorkers.get(service);
    if (!workers || workers.length === 0) {
      return null;
    }
    
    // Simple round-robin selection
    const workerId = workers.shift()!;
    workers.push(workerId);
    
    return workerId;
  }

  private async processPendingRequests(service: string): Promise<void> {
    const pending = this.pendingRequests.filter(r => r.service === service);
    
    for (const request of pending) {
      const workerId = this.getAvailableWorker(service);
      if (!workerId) break;
      
      const worker = this.workers.get(workerId);
      if (worker) {
        // Remove from pending
        const index = this.pendingRequests.indexOf(request);
        this.pendingRequests.splice(index, 1);
        
        // Forward to worker
        await this.sendToWorker(
          worker,
          MDP.W_REQUEST,
          Buffer.from(request.client),
          Buffer.from(request.requestId)
        );
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 5000; // 5 second timeout
      
      // Check worker heartbeats
      for (const [workerId, worker] of this.workers) {
        if (now - worker.lastHeartbeat > timeout) {
          this.logger.warn({ workerId, service: worker.service }, 'Worker timeout, disconnecting');
          this.handleWorkerDisconnect(Buffer.from(workerId));
        }
      }
      
      // Clean up old pending requests
      this.pendingRequests = this.pendingRequests.filter(
        r => now - r.timestamp < 30000 // 30 second timeout
      );
    }, 2500);
  }

  private async startMockWorkers(): Promise<void> {
    // Import and start mock service workers
    const { MockAuthWorker } = await import('./workers/mock-auth-worker');
    const { MockAccountWorker } = await import('./workers/mock-account-worker');
    const { MockAlgorithmWorker } = await import('./workers/mock-algorithm-worker');
    const { MockInstructionWorker } = await import('./workers/mock-instruction-worker');
    
    // Start workers
    const authWorker = new MockAuthWorker(this.routerUrl, this.logger);
    const accountWorker = new MockAccountWorker(this.routerUrl, this.logger);
    const algorithmWorker = new MockAlgorithmWorker(this.routerUrl, this.logger);
    const instructionWorker = new MockInstructionWorker(this.routerUrl, this.logger);
    
    await Promise.all([
      authWorker.start(),
      accountWorker.start(),
      algorithmWorker.start(),
      instructionWorker.start(),
    ]);
    
    this.logger.info('Mock workers started');
  }

  // Publish market data or events
  async publish(topic: string, data: any): Promise<void> {
    if (!this.publisher) return;
    
    const topicBuffer = Buffer.from(topic);
    const dataBuffer = Buffer.from(JSON.stringify(data));
    
    await this.publisher.send([topicBuffer, dataBuffer]);
  }
}