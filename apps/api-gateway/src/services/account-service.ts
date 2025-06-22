import { BaseService } from './base-service';
import { AccountStatus, AccountPosition, AccountRisk } from '@xiaoy/zmq-protocol';

export interface AccountInfo {
  id: string;
  name: string;
  status: AccountStatus;
  balance: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdate: number;
}

export interface AccountUpdateEvent {
  accountId: string;
  type: 'balance' | 'position' | 'status' | 'risk';
  data: any;
  timestamp: number;
}

export class AccountService extends BaseService {
  private accountSubscriptions: Map<string, Set<(update: AccountUpdateEvent) => void>> = new Map();

  constructor(zmqClient: any, logger: any) {
    super('account_service', zmqClient, logger);
  }

  /**
   * Get all virtual accounts
   */
  async getAccounts(): Promise<AccountInfo[]> {
    try {
      const accounts = await this.call('get_accounts');
      return accounts.map(this.transformAccountInfo);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get accounts');
      return [];
    }
  }

  /**
   * Get specific account details
   */
  async getAccount(accountId: string): Promise<AccountInfo | null> {
    try {
      const account = await this.call('get_account', [accountId]);
      return account ? this.transformAccountInfo(account) : null;
    } catch (error) {
      this.logger.error({ error, accountId }, 'Failed to get account');
      return null;
    }
  }

  /**
   * Get account positions
   */
  async getPositions(accountId: string): Promise<AccountPosition[]> {
    try {
      const positions = await this.call('get_positions', [accountId]);
      return positions || [];
    } catch (error) {
      this.logger.error({ error, accountId }, 'Failed to get positions');
      return [];
    }
  }

  /**
   * Get account risk metrics
   */
  async getRiskMetrics(accountId: string): Promise<AccountRisk | null> {
    try {
      return await this.call('get_risk_metrics', [accountId]);
    } catch (error) {
      this.logger.error({ error, accountId }, 'Failed to get risk metrics');
      return null;
    }
  }

  /**
   * Enable/disable account
   */
  async setAccountEnabled(accountId: string, enabled: boolean): Promise<boolean> {
    try {
      const result = await this.call('set_account_enabled', [accountId, enabled]);
      return result.success ?? false;
    } catch (error) {
      this.logger.error({ error, accountId, enabled }, 'Failed to set account status');
      return false;
    }
  }

  /**
   * Verify account positions
   */
  async verifyPositions(accountId: string): Promise<{
    verified: boolean;
    discrepancies?: Array<{
      contract: string;
      expected: number;
      actual: number;
    }>;
  }> {
    try {
      return await this.call('verify_positions', [accountId]);
    } catch (error) {
      this.logger.error({ error, accountId }, 'Failed to verify positions');
      return { verified: false };
    }
  }

  /**
   * Subscribe to account updates
   */
  async subscribeToAccount(
    accountId: string, 
    callback: (update: AccountUpdateEvent) => void
  ): Promise<() => void> {
    // Store the subscription
    if (!this.accountSubscriptions.has(accountId)) {
      this.accountSubscriptions.set(accountId, new Set());
      
      // Start subscription with backend
      try {
        await this.call('subscribe_account', [accountId]);
        this.logger.info({ accountId }, 'Subscribed to account updates');
      } catch (error) {
        this.logger.error({ error, accountId }, 'Failed to subscribe to account');
      }
    }

    this.accountSubscriptions.get(accountId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.accountSubscriptions.get(accountId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.accountSubscriptions.delete(accountId);
          // Unsubscribe from backend
          this.call('unsubscribe_account', [accountId]).catch(error => {
            this.logger.error({ error, accountId }, 'Failed to unsubscribe from account');
          });
        }
      }
    };
  }

  /**
   * Handle incoming account update from ZMQ
   */
  handleAccountUpdate(update: AccountUpdateEvent): void {
    const callbacks = this.accountSubscriptions.get(update.accountId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          this.logger.error({ error, update }, 'Error in account update callback');
        }
      });
    }
  }

  /**
   * Get account transaction history
   */
  async getTransactionHistory(
    accountId: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<any[]> {
    try {
      return await this.call('get_transaction_history', [], {
        account_id: accountId,
        start_time: startTime,
        end_time: endTime,
        limit,
      });
    } catch (error) {
      this.logger.error({ error, accountId }, 'Failed to get transaction history');
      return [];
    }
  }

  /**
   * Transform backend account format to frontend format
   */
  private transformAccountInfo(account: any): AccountInfo {
    return {
      id: account.id || account.account_id,
      name: account.name || account.account_name,
      status: account.status || AccountStatus.ACTIVE,
      balance: account.balance || 0,
      availableBalance: account.available_balance || account.availableBalance || 0,
      usedMargin: account.used_margin || account.usedMargin || 0,
      unrealizedPnL: account.unrealized_pnl || account.unrealizedPnL || 0,
      realizedPnL: account.realized_pnl || account.realizedPnL || 0,
      lastUpdate: account.last_update || account.lastUpdate || Date.now(),
    };
  }
}