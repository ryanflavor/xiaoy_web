import { Socket } from 'socket.io';
import { Logger } from 'pino';
import { AccountService } from '../../services/account-service';

export function registerAccountHandlers(
  socket: Socket,
  accountService: AccountService,
  logger: Logger
) {
  // Subscribe to account updates
  socket.on('account:subscribe', async (data: { accountIds: string[] }) => {
    try {
      const { accountIds } = data;
      
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        socket.emit('account:error', {
          message: 'Invalid account IDs',
        });
        return;
      }

      // Subscribe to each account
      const unsubscribes: Array<() => void> = [];
      
      for (const accountId of accountIds) {
        // Join account-specific room
        socket.join(`account:${accountId}`);
        
        // Subscribe to updates
        const unsubscribe = await accountService.subscribeToAccount(accountId, (update) => {
          socket.emit('account:update', update);
        });
        
        unsubscribes.push(unsubscribe);
      }

      // Store unsubscribe functions for cleanup
      socket.data.accountUnsubscribes = unsubscribes;

      // Send confirmation
      socket.emit('account:subscribed', {
        accountIds,
        timestamp: Date.now(),
      });

      logger.debug({ socketId: socket.id, accountIds }, 'Subscribed to accounts');
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to subscribe to accounts');
      socket.emit('account:error', {
        message: 'Failed to subscribe to accounts',
      });
    }
  });

  // Unsubscribe from account updates
  socket.on('account:unsubscribe', async (data: { accountIds: string[] }) => {
    try {
      const { accountIds } = data;
      
      // Leave account rooms
      for (const accountId of accountIds) {
        socket.leave(`account:${accountId}`);
      }

      // Clean up subscriptions
      if (socket.data.accountUnsubscribes) {
        socket.data.accountUnsubscribes.forEach((unsub: () => void) => unsub());
        delete socket.data.accountUnsubscribes;
      }

      socket.emit('account:unsubscribed', {
        accountIds,
        timestamp: Date.now(),
      });

      logger.debug({ socketId: socket.id, accountIds }, 'Unsubscribed from accounts');
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to unsubscribe from accounts');
      socket.emit('account:error', {
        message: 'Failed to unsubscribe from accounts',
      });
    }
  });

  // Get real-time account status
  socket.on('account:status', async (data: { accountId: string }) => {
    try {
      const account = await accountService.getAccount(data.accountId);
      
      if (!account) {
        socket.emit('account:error', {
          message: 'Account not found',
        });
        return;
      }

      socket.emit('account:status:response', {
        accountId: data.accountId,
        status: account.status,
        lastUpdate: account.lastUpdate,
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to get account status');
      socket.emit('account:error', {
        message: 'Failed to get account status',
      });
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    if (socket.data.accountUnsubscribes) {
      socket.data.accountUnsubscribes.forEach((unsub: () => void) => unsub());
    }
  });
}