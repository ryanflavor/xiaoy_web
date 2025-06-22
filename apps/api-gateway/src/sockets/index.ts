import { Server as SocketIOServer, Socket } from 'socket.io';
import { Logger } from 'pino';
import { ServiceManager } from '../services/service-manager';
import { authMiddleware } from './middleware/auth';
import { registerAccountHandlers } from './handlers/account-handlers';
import { registerAlgorithmHandlers } from './handlers/algorithm-handlers';
import { registerInstructionHandlers } from './handlers/instruction-handlers';

export function registerSocketHandlers(
  io: SocketIOServer,
  services: ServiceManager,
  logger: Logger
) {
  const socketLogger = logger.child({ component: 'SocketIO' });

  // Apply authentication middleware
  io.use((socket, next) => authMiddleware(socket, next, services.auth));

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as any).userId;
    socketLogger.info({ socketId: socket.id, userId }, 'Client connected');

    // Join user-specific room for targeted messaging
    socket.join(`user:${userId}`);

    // Register handlers
    registerAccountHandlers(socket, services.account, socketLogger);
    registerAlgorithmHandlers(socket, services.algorithm, socketLogger);
    registerInstructionHandlers(socket, services.instruction, socketLogger);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      socketLogger.info({ socketId: socket.id, userId, reason }, 'Client disconnected');
    });

    // Handle errors
    socket.on('error', (error) => {
      socketLogger.error({ socketId: socket.id, userId, error }, 'Socket error');
    });

    // Send initial connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: Date.now(),
    });
  });

  // Error handling for the server
  io.on('error', (error) => {
    socketLogger.error({ error }, 'Socket.IO server error');
  });

  socketLogger.info('Socket.IO handlers registered');
}