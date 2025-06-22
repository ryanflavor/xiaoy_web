import { Logger } from 'pino';
import { ZMQClientManager } from '../integrations/zmq/client-manager';
import { ZMQProtocolError } from '@xiaoy/zmq-protocol';

export abstract class BaseService {
  protected serviceName: string;
  protected zmqClient: ZMQClientManager;
  protected logger: Logger;

  constructor(
    serviceName: string,
    zmqClient: ZMQClientManager,
    logger: Logger
  ) {
    this.serviceName = serviceName;
    this.zmqClient = zmqClient;
    this.logger = logger.child({ service: serviceName });
  }

  /**
   * Call a method on the remote service
   */
  protected async call(
    method: string,
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<any> {
    try {
      const result = await this.zmqClient.call(
        this.serviceName,
        method,
        args,
        kwargs
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        { 
          method, 
          args, 
          kwargs, 
          error: error instanceof Error ? error.message : String(error) 
        },
        'Service call failed'
      );
      
      // Re-throw with more context
      if (error instanceof ZMQProtocolError) {
        throw error;
      }
      
      throw new ZMQProtocolError(
        `Failed to call ${this.serviceName}.${method}`,
        error as Error
      );
    }
  }

  /**
   * Check if the service is available
   */
  async ping(): Promise<boolean> {
    try {
      await this.call('ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    service: string;
    message?: string;
  }> {
    try {
      const result = await this.call('get_health');
      return {
        healthy: true,
        service: this.serviceName,
        ...result,
      };
    } catch (error) {
      return {
        healthy: false,
        service: this.serviceName,
        message: error instanceof Error ? error.message : 'Service unavailable',
      };
    }
  }
}