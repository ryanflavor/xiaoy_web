import { Socket } from 'socket.io';
import { Logger } from 'pino';
import { AlgorithmService } from '../../services/algorithm-service';
import { AlgorithmCommand } from '@xiaoy/zmq-protocol';

export function registerAlgorithmHandlers(
  socket: Socket,
  algorithmService: AlgorithmService,
  logger: Logger
) {
  // Subscribe to algorithm updates
  socket.on('algorithm:subscribe', async (data: { algorithmIds: string[] }) => {
    try {
      const { algorithmIds } = data;
      
      if (!Array.isArray(algorithmIds) || algorithmIds.length === 0) {
        socket.emit('algorithm:error', {
          message: 'Invalid algorithm IDs',
        });
        return;
      }

      // Subscribe to each algorithm
      const unsubscribes: Array<() => void> = [];
      
      for (const algorithmId of algorithmIds) {
        // Join algorithm-specific room
        socket.join(`algorithm:${algorithmId}`);
        
        // Subscribe to updates
        const unsubscribe = await algorithmService.subscribeToAlgorithm(algorithmId, (update) => {
          socket.emit('algorithm:update', update);
        });
        
        unsubscribes.push(unsubscribe);
      }

      // Store unsubscribe functions for cleanup
      socket.data.algorithmUnsubscribes = unsubscribes;

      // Send confirmation
      socket.emit('algorithm:subscribed', {
        algorithmIds,
        timestamp: Date.now(),
      });

      logger.debug({ socketId: socket.id, algorithmIds }, 'Subscribed to algorithms');
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to subscribe to algorithms');
      socket.emit('algorithm:error', {
        message: 'Failed to subscribe to algorithms',
      });
    }
  });

  // Subscribe to portfolio algorithms
  socket.on('algorithm:subscribe:portfolio', async (data: { portfolioId: string }) => {
    try {
      const { portfolioId } = data;
      
      // Subscribe to all algorithms in portfolio
      const unsubscribe = await algorithmService.subscribeToPortfolio(portfolioId, (update) => {
        socket.emit('algorithm:update', update);
      });

      // Store unsubscribe function
      socket.data.portfolioUnsubscribe = unsubscribe;

      // Join portfolio room
      socket.join(`portfolio:${portfolioId}`);

      socket.emit('algorithm:subscribed:portfolio', {
        portfolioId,
        timestamp: Date.now(),
      });

      logger.debug({ socketId: socket.id, portfolioId }, 'Subscribed to portfolio');
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to subscribe to portfolio');
      socket.emit('algorithm:error', {
        message: 'Failed to subscribe to portfolio',
      });
    }
  });

  // Send algorithm command
  socket.on('algorithm:command', async (data: { 
    algorithmId: string; 
    command: AlgorithmCommand;
  }) => {
    try {
      const { algorithmId, command } = data;
      
      const success = await algorithmService.sendCommand(algorithmId, command);
      
      socket.emit('algorithm:command:response', {
        algorithmId,
        command,
        success,
        timestamp: Date.now(),
      });

      if (success) {
        // Broadcast to all clients watching this algorithm
        socket.to(`algorithm:${algorithmId}`).emit('algorithm:command:broadcast', {
          algorithmId,
          command,
          userId: socket.data.userId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to send algorithm command');
      socket.emit('algorithm:error', {
        message: 'Failed to send algorithm command',
      });
    }
  });

  // Get algorithm progress
  socket.on('algorithm:progress', async (data: { algorithmId: string }) => {
    try {
      const algorithm = await algorithmService.getAlgorithm(data.algorithmId);
      
      if (!algorithm) {
        socket.emit('algorithm:error', {
          message: 'Algorithm not found',
        });
        return;
      }

      socket.emit('algorithm:progress:response', {
        algorithmId: data.algorithmId,
        progress: algorithm.progress,
        accountProgress: algorithm.accountProgress,
        status: algorithm.status,
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to get algorithm progress');
      socket.emit('algorithm:error', {
        message: 'Failed to get algorithm progress',
      });
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    if (socket.data.algorithmUnsubscribes) {
      socket.data.algorithmUnsubscribes.forEach((unsub: () => void) => unsub());
    }
    if (socket.data.portfolioUnsubscribe) {
      socket.data.portfolioUnsubscribe();
    }
  });
}