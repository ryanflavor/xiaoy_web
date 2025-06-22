import { BaseService } from './base-service';
import { AlgorithmStatus, AlgorithmCommand } from '@xiaoy/zmq-protocol';

export interface AlgorithmInfo {
  id: string;
  portfolioId: string;
  name: string;
  status: AlgorithmStatus;
  progress: number;
  accountProgress: Record<string, number>;
  startTime: number;
  endTime?: number;
  error?: string;
  stats?: {
    ordersExecuted: number;
    ordersSuccessful: number;
    ordersFailed: number;
    totalVolume: number;
  };
}

export interface AlgorithmUpdateEvent {
  algorithmId: string;
  type: 'status' | 'progress' | 'error' | 'complete';
  data: any;
  timestamp: number;
}

export class AlgorithmService extends BaseService {
  private algorithmSubscriptions: Map<string, Set<(update: AlgorithmUpdateEvent) => void>> = new Map();

  constructor(zmqClient: any, logger: any) {
    super('algorithm_service', zmqClient, logger);
  }

  /**
   * Get all running algorithms
   */
  async getAlgorithms(): Promise<AlgorithmInfo[]> {
    try {
      const algorithms = await this.call('get_algorithms');
      return algorithms.map(this.transformAlgorithmInfo);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get algorithms');
      return [];
    }
  }

  /**
   * Get algorithms grouped by portfolio
   */
  async getAlgorithmsByPortfolio(): Promise<Record<string, AlgorithmInfo[]>> {
    const algorithms = await this.getAlgorithms();
    
    return algorithms.reduce((grouped, algo) => {
      const portfolioId = algo.portfolioId || 'default';
      if (!grouped[portfolioId]) {
        grouped[portfolioId] = [];
      }
      grouped[portfolioId].push(algo);
      return grouped;
    }, {} as Record<string, AlgorithmInfo[]>);
  }

  /**
   * Get specific algorithm details
   */
  async getAlgorithm(algorithmId: string): Promise<AlgorithmInfo | null> {
    try {
      const algorithm = await this.call('get_algorithm', [algorithmId]);
      return algorithm ? this.transformAlgorithmInfo(algorithm) : null;
    } catch (error) {
      this.logger.error({ error, algorithmId }, 'Failed to get algorithm');
      return null;
    }
  }

  /**
   * Send command to algorithm (pause, resume, stop, end)
   */
  async sendCommand(
    algorithmId: string, 
    command: AlgorithmCommand
  ): Promise<boolean> {
    try {
      const result = await this.call('send_algorithm_command', [algorithmId, command]);
      return result.success ?? false;
    } catch (error) {
      this.logger.error({ error, algorithmId, command }, 'Failed to send algorithm command');
      return false;
    }
  }

  /**
   * Pause algorithm execution
   */
  async pauseAlgorithm(algorithmId: string): Promise<boolean> {
    return this.sendCommand(algorithmId, AlgorithmCommand.PAUSE);
  }

  /**
   * Resume algorithm execution
   */
  async resumeAlgorithm(algorithmId: string): Promise<boolean> {
    return this.sendCommand(algorithmId, AlgorithmCommand.CONTINUE);
  }

  /**
   * Stop algorithm (can be restarted)
   */
  async stopAlgorithm(algorithmId: string): Promise<boolean> {
    return this.sendCommand(algorithmId, AlgorithmCommand.STOP);
  }

  /**
   * End algorithm (final stop, cannot be restarted)
   */
  async endAlgorithm(algorithmId: string): Promise<boolean> {
    return this.sendCommand(algorithmId, AlgorithmCommand.END);
  }

  /**
   * Subscribe to algorithm updates
   */
  async subscribeToAlgorithm(
    algorithmId: string,
    callback: (update: AlgorithmUpdateEvent) => void
  ): Promise<() => void> {
    // Store the subscription
    if (!this.algorithmSubscriptions.has(algorithmId)) {
      this.algorithmSubscriptions.set(algorithmId, new Set());
      
      // Start subscription with backend
      try {
        await this.call('subscribe_algorithm', [algorithmId]);
        this.logger.info({ algorithmId }, 'Subscribed to algorithm updates');
      } catch (error) {
        this.logger.error({ error, algorithmId }, 'Failed to subscribe to algorithm');
      }
    }

    this.algorithmSubscriptions.get(algorithmId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.algorithmSubscriptions.get(algorithmId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.algorithmSubscriptions.delete(algorithmId);
          // Unsubscribe from backend
          this.call('unsubscribe_algorithm', [algorithmId]).catch(error => {
            this.logger.error({ error, algorithmId }, 'Failed to unsubscribe from algorithm');
          });
        }
      }
    };
  }

  /**
   * Subscribe to all algorithms in a portfolio
   */
  async subscribeToPortfolio(
    portfolioId: string,
    callback: (update: AlgorithmUpdateEvent) => void
  ): Promise<() => void> {
    try {
      // Get all algorithms in the portfolio
      const algorithms = await this.getAlgorithms();
      const portfolioAlgorithms = algorithms.filter(
        algo => algo.portfolioId === portfolioId
      );

      // Subscribe to each algorithm
      const unsubscribes = await Promise.all(
        portfolioAlgorithms.map(algo => 
          this.subscribeToAlgorithm(algo.id, callback)
        )
      );

      // Return function to unsubscribe from all
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    } catch (error) {
      this.logger.error({ error, portfolioId }, 'Failed to subscribe to portfolio');
      return () => {};
    }
  }

  /**
   * Handle incoming algorithm update from ZMQ
   */
  handleAlgorithmUpdate(update: AlgorithmUpdateEvent): void {
    const callbacks = this.algorithmSubscriptions.get(update.algorithmId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          this.logger.error({ error, update }, 'Error in algorithm update callback');
        }
      });
    }
  }

  /**
   * Get algorithm execution history
   */
  async getAlgorithmHistory(
    portfolioId?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<any[]> {
    try {
      return await this.call('get_algorithm_history', [], {
        portfolio_id: portfolioId,
        start_time: startTime,
        end_time: endTime,
        limit,
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get algorithm history');
      return [];
    }
  }

  /**
   * Get algorithm logs
   */
  async getAlgorithmLogs(
    algorithmId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<{
    timestamp: number;
    level: string;
    message: string;
  }>> {
    try {
      return await this.call('get_algorithm_logs', [], {
        algorithm_id: algorithmId,
        limit,
        offset,
      });
    } catch (error) {
      this.logger.error({ error, algorithmId }, 'Failed to get algorithm logs');
      return [];
    }
  }

  /**
   * Transform backend algorithm format to frontend format
   */
  private transformAlgorithmInfo(algo: any): AlgorithmInfo {
    return {
      id: algo.id || algo.algorithm_id,
      portfolioId: algo.portfolio_id || algo.portfolioId || 'default',
      name: algo.name || algo.algorithm_name || 'Unnamed Algorithm',
      status: algo.status || AlgorithmStatus.PENDING,
      progress: algo.progress || 0,
      accountProgress: algo.account_progress || algo.accountProgress || {},
      startTime: algo.start_time || algo.startTime || Date.now(),
      endTime: algo.end_time || algo.endTime,
      error: algo.error,
      stats: algo.stats,
    };
  }
}