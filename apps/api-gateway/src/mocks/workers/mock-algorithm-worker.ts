import { BaseMockWorker } from './base-mock-worker';
import { Logger } from 'pino';
import { AlgorithmStatus, AlgorithmCommand } from '@xiaoy/zmq-protocol';

export class MockAlgorithmWorker extends BaseMockWorker {
  private mockAlgorithms = [
    {
      id: 'algo1',
      portfolio_id: 'portfolio1',
      name: 'Vega Hedge Algorithm',
      status: AlgorithmStatus.RUNNING,
      progress: 65,
      account_progress: {
        account1: 70,
        account2: 60,
      },
      start_time: Date.now() - 3600000,
      stats: {
        ordersExecuted: 120,
        ordersSuccessful: 115,
        ordersFailed: 5,
        totalVolume: 50000,
      },
    },
    {
      id: 'algo2',
      portfolio_id: 'portfolio1',
      name: 'Delta Neutral Strategy',
      status: AlgorithmStatus.PAUSED,
      progress: 40,
      account_progress: {
        account1: 45,
        account2: 35,
      },
      start_time: Date.now() - 7200000,
      stats: {
        ordersExecuted: 80,
        ordersSuccessful: 78,
        ordersFailed: 2,
        totalVolume: 30000,
      },
    },
    {
      id: 'algo3',
      portfolio_id: 'portfolio2',
      name: 'Risk Arbitrage',
      status: AlgorithmStatus.COMPLETED,
      progress: 100,
      account_progress: {
        account1: 100,
      },
      start_time: Date.now() - 14400000,
      end_time: Date.now() - 3600000,
      stats: {
        ordersExecuted: 200,
        ordersSuccessful: 195,
        ordersFailed: 5,
        totalVolume: 100000,
      },
    },
  ];

  constructor(brokerUrl: string, logger: Logger) {
    super('algorithm_service', brokerUrl, logger);
    
    // Simulate algorithm progress updates
    setInterval(() => {
      this.updateAlgorithmProgress();
    }, 5000);
  }

  protected async handleServiceCall(
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<any> {
    switch (method) {
      case 'get_algorithms':
        return this.getAlgorithms();
      
      case 'get_algorithm':
        return this.getAlgorithm(args[0]);
      
      case 'send_algorithm_command':
        return this.sendAlgorithmCommand(args[0], args[1]);
      
      case 'subscribe_algorithm':
        return this.subscribeAlgorithm(args[0]);
      
      case 'unsubscribe_algorithm':
        return this.unsubscribeAlgorithm(args[0]);
      
      case 'get_algorithm_history':
        return this.getAlgorithmHistory(kwargs);
      
      case 'get_algorithm_logs':
        return this.getAlgorithmLogs(kwargs);
      
      case 'ping':
        return 'pong';
      
      case 'get_health':
        return { healthy: true, message: 'Mock algorithm service is healthy' };
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getAlgorithms() {
    return this.mockAlgorithms;
  }

  private getAlgorithm(algorithmId: string) {
    return this.mockAlgorithms.find(a => a.id === algorithmId) || null;
  }

  private sendAlgorithmCommand(algorithmId: string, command: AlgorithmCommand) {
    const algorithm = this.mockAlgorithms.find(a => a.id === algorithmId);
    
    if (!algorithm) {
      return { success: false, message: 'Algorithm not found' };
    }
    
    switch (command) {
      case AlgorithmCommand.PAUSE:
        if (algorithm.status === AlgorithmStatus.RUNNING) {
          algorithm.status = AlgorithmStatus.PAUSED;
          return { success: true };
        }
        break;
      
      case AlgorithmCommand.CONTINUE:
        if (algorithm.status === AlgorithmStatus.PAUSED) {
          algorithm.status = AlgorithmStatus.RUNNING;
          return { success: true };
        }
        break;
      
      case AlgorithmCommand.STOP:
        if (algorithm.status !== AlgorithmStatus.COMPLETED) {
          algorithm.status = AlgorithmStatus.STOPPED;
          algorithm.end_time = Date.now();
          return { success: true };
        }
        break;
      
      case AlgorithmCommand.END:
        if (algorithm.progress === 100) {
          algorithm.status = AlgorithmStatus.COMPLETED;
          algorithm.end_time = Date.now();
          return { success: true };
        }
        break;
    }
    
    return { success: false, message: 'Invalid command for current algorithm state' };
  }

  private subscribeAlgorithm(algorithmId: string) {
    // In real implementation, this would set up pub/sub
    return { success: true };
  }

  private unsubscribeAlgorithm(algorithmId: string) {
    return { success: true };
  }

  private getAlgorithmHistory(kwargs: any) {
    const { portfolio_id, start_time, end_time, limit = 10 } = kwargs;
    
    const history = [];
    for (let i = 0; i < limit; i++) {
      history.push({
        id: `algo_hist_${i}`,
        portfolio_id: portfolio_id || 'portfolio1',
        name: `Historical Algorithm ${i}`,
        status: AlgorithmStatus.COMPLETED,
        progress: 100,
        start_time: Date.now() - ((i + 1) * 86400000),
        end_time: Date.now() - (i * 86400000),
        total_orders: 100 + (i * 20),
        successful_orders: 95 + (i * 18),
        total_volume: 50000 + (i * 10000),
      });
    }
    
    return history;
  }

  private getAlgorithmLogs(kwargs: any) {
    const { algorithm_id, limit = 20, offset = 0 } = kwargs;
    
    const logs = [];
    const levels = ['info', 'warn', 'error', 'debug'];
    
    for (let i = 0; i < limit; i++) {
      logs.push({
        timestamp: Date.now() - ((offset + i) * 60000),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: `Algorithm ${algorithm_id} log entry ${offset + i}`,
      });
    }
    
    return logs;
  }

  private updateAlgorithmProgress() {
    // Simulate progress updates for running algorithms
    this.mockAlgorithms.forEach(algo => {
      if (algo.status === AlgorithmStatus.RUNNING && algo.progress < 100) {
        algo.progress = Math.min(100, algo.progress + Math.random() * 5);
        
        // Update account progress
        Object.keys(algo.account_progress).forEach(accountId => {
          algo.account_progress[accountId] = Math.min(
            100,
            algo.account_progress[accountId] + Math.random() * 5
          );
        });
        
        // Update stats
        if (algo.stats) {
          algo.stats.ordersExecuted += Math.floor(Math.random() * 3);
          algo.stats.ordersSuccessful += Math.floor(Math.random() * 3);
          algo.stats.totalVolume += Math.floor(Math.random() * 1000);
        }
        
        // Complete algorithm if progress reaches 100
        if (algo.progress >= 100) {
          algo.status = AlgorithmStatus.COMPLETED;
          algo.end_time = Date.now();
        }
      }
    });
  }
}