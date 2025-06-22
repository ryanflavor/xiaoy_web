import { BaseMockWorker } from './base-mock-worker';
import { Logger } from 'pino';
import { AccountStatus } from '@xiaoy/zmq-protocol';

export class MockAccountWorker extends BaseMockWorker {
  private mockAccounts = [
    {
      id: 'account1',
      name: '模拟账户1',
      status: AccountStatus.ACTIVE,
      balance: 1000000,
      available_balance: 800000,
      used_margin: 200000,
      unrealized_pnl: 5000,
      realized_pnl: 12000,
      last_update: Date.now(),
    },
    {
      id: 'account2',
      name: '模拟账户2',
      status: AccountStatus.ACTIVE,
      balance: 2000000,
      available_balance: 1500000,
      used_margin: 500000,
      unrealized_pnl: -8000,
      realized_pnl: 25000,
      last_update: Date.now(),
    },
    {
      id: 'account3',
      name: '测试账户',
      status: AccountStatus.INACTIVE,
      balance: 500000,
      available_balance: 500000,
      used_margin: 0,
      unrealized_pnl: 0,
      realized_pnl: 0,
      last_update: Date.now(),
    },
  ];

  private mockPositions: Record<string, any[]> = {
    account1: [
      {
        contract: '沪50-5.0-call',
        quantity: 100,
        avg_price: 0.0523,
        current_price: 0.0545,
        unrealized_pnl: 220,
        margin: 50000,
      },
      {
        contract: '沪300-4.5-put',
        quantity: -50,
        avg_price: 0.0234,
        current_price: 0.0256,
        unrealized_pnl: -110,
        margin: 30000,
      },
    ],
    account2: [
      {
        contract: '沪500-5.5-call',
        quantity: 200,
        avg_price: 0.0612,
        current_price: 0.0598,
        unrealized_pnl: -280,
        margin: 120000,
      },
    ],
  };

  constructor(brokerUrl: string, logger: Logger) {
    super('account_service', brokerUrl, logger);
  }

  protected async handleServiceCall(
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<any> {
    switch (method) {
      case 'get_accounts':
        return this.getAccounts();
      
      case 'get_account':
        return this.getAccount(args[0]);
      
      case 'get_positions':
        return this.getPositions(args[0]);
      
      case 'get_risk_metrics':
        return this.getRiskMetrics(args[0]);
      
      case 'set_account_enabled':
        return this.setAccountEnabled(args[0], args[1]);
      
      case 'verify_positions':
        return this.verifyPositions(args[0]);
      
      case 'subscribe_account':
        return this.subscribeAccount(args[0]);
      
      case 'unsubscribe_account':
        return this.unsubscribeAccount(args[0]);
      
      case 'get_transaction_history':
        return this.getTransactionHistory(kwargs);
      
      case 'ping':
        return 'pong';
      
      case 'get_health':
        return { healthy: true, message: 'Mock account service is healthy' };
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getAccounts() {
    return this.mockAccounts;
  }

  private getAccount(accountId: string) {
    return this.mockAccounts.find(a => a.id === accountId) || null;
  }

  private getPositions(accountId: string) {
    return this.mockPositions[accountId] || [];
  }

  private getRiskMetrics(accountId: string) {
    const account = this.mockAccounts.find(a => a.id === accountId);
    if (!account) return null;
    
    return {
      account_id: accountId,
      total_delta: 0.25,
      total_gamma: 0.02,
      total_vega: 150,
      total_theta: -85,
      margin_usage: account.used_margin / account.balance,
      var_95: 25000,
      var_99: 35000,
      max_loss_scenario: -45000,
    };
  }

  private setAccountEnabled(accountId: string, enabled: boolean) {
    const account = this.mockAccounts.find(a => a.id === accountId);
    if (account) {
      account.status = enabled ? AccountStatus.ACTIVE : AccountStatus.INACTIVE;
      return { success: true };
    }
    return { success: false, message: 'Account not found' };
  }

  private verifyPositions(accountId: string) {
    // Mock position verification
    return {
      verified: true,
      discrepancies: [],
    };
  }

  private subscribeAccount(accountId: string) {
    // In real implementation, this would set up pub/sub
    return { success: true };
  }

  private unsubscribeAccount(accountId: string) {
    return { success: true };
  }

  private getTransactionHistory(kwargs: any) {
    const { account_id, start_time, end_time, limit = 10 } = kwargs;
    
    const transactions = [];
    for (let i = 0; i < limit; i++) {
      transactions.push({
        id: `txn_${i}`,
        account_id,
        timestamp: Date.now() - (i * 3600000),
        type: i % 2 === 0 ? 'buy' : 'sell',
        contract: '沪50-5.0-call',
        quantity: (i + 1) * 10,
        price: 0.05 + (Math.random() * 0.01),
        commission: 5,
        status: 'filled',
      });
    }
    
    return transactions;
  }
}