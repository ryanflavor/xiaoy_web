import { Logger } from 'pino';
import { ZMQClientManager } from '../integrations/zmq/client-manager';
import {
  AuthService,
  AccountService,
  AlgorithmService,
  InstructionService,
} from './index';

export interface ServiceManagerConfig {
  zmq: {
    brokerUrl: string;
    timeout: number;
    retries: number;
    heartbeatInterval: number;
    pythonPath?: string;
    pythonScriptPath?: string;
    verbose?: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn?: string;
  };
}

export class ServiceManager {
  private zmqClient: ZMQClientManager;
  private logger: Logger;
  
  public auth: AuthService;
  public account: AccountService;
  public algorithm: AlgorithmService;
  public instruction: InstructionService;

  constructor(config: ServiceManagerConfig, logger: Logger) {
    this.logger = logger.child({ component: 'ServiceManager' });
    
    // Initialize ZMQ client
    this.zmqClient = new ZMQClientManager(config.zmq, this.logger);
    
    // Initialize services
    this.auth = new AuthService(
      this.zmqClient,
      this.logger,
      config.auth.jwtSecret,
      config.auth.jwtExpiresIn
    );
    
    this.account = new AccountService(this.zmqClient, this.logger);
    this.algorithm = new AlgorithmService(this.zmqClient, this.logger);
    this.instruction = new InstructionService(this.zmqClient, this.logger);
  }

  /**
   * Start all services
   */
  async start(): Promise<void> {
    try {
      // Start ZMQ client
      await this.zmqClient.start();
      this.logger.info('ZMQ client started');

      // Test service connectivity
      await this.testConnectivity();
      
      this.logger.info('All services started successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start services');
      throw error;
    }
  }

  /**
   * Stop all services
   */
  async stop(): Promise<void> {
    try {
      await this.zmqClient.stop();
      this.logger.info('All services stopped');
    } catch (error) {
      this.logger.error({ error }, 'Error stopping services');
      throw error;
    }
  }

  /**
   * Test connectivity to all backend services
   */
  private async testConnectivity(): Promise<void> {
    const services = [
      { name: 'auth', service: this.auth },
      { name: 'account', service: this.account },
      { name: 'algorithm', service: this.algorithm },
      { name: 'instruction', service: this.instruction },
    ];

    const results = await Promise.allSettled(
      services.map(async ({ name, service }) => {
        const healthy = await service.ping();
        return { name, healthy };
      })
    );

    const failures = results
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.healthy))
      .map((r, i) => services[i].name);

    if (failures.length > 0) {
      this.logger.warn(
        { failedServices: failures },
        'Some services are not responding'
      );
    } else {
      this.logger.info('All services are healthy');
    }
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    services: Record<string, any>;
    zmq: any;
  }> {
    const [authHealth, accountHealth, algorithmHealth, instructionHealth] = 
      await Promise.allSettled([
        this.auth.getHealth(),
        this.account.getHealth(),
        this.algorithm.getHealth(),
        this.instruction.getHealth(),
      ]);

    const services = {
      auth: authHealth.status === 'fulfilled' ? authHealth.value : { healthy: false },
      account: accountHealth.status === 'fulfilled' ? accountHealth.value : { healthy: false },
      algorithm: algorithmHealth.status === 'fulfilled' ? algorithmHealth.value : { healthy: false },
      instruction: instructionHealth.status === 'fulfilled' ? instructionHealth.value : { healthy: false },
    };

    const allHealthy = Object.values(services).every(s => s.healthy);

    return {
      healthy: allHealthy && this.zmqClient.isConnected(),
      services,
      zmq: this.zmqClient.getMetrics(),
    };
  }
}