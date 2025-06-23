import Fastify, { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './types/env';
import { ServiceManager } from './services/service-manager';
import { MockZMQBroker } from './mocks';

// Middleware imports
import { registerCors } from './middleware/cors';
import { registerSecurity } from './middleware/security';
import { registerLogging } from './middleware/logging';
import { registerAuth } from './middleware/auth';

// Controller imports
import { registerHealthRoutes } from './controllers/health';
import { registerAuthRoutes } from './controllers/auth';
import { registerInstructionRoutes } from './controllers/instructions';
import { registerAccountRoutes } from './controllers/accounts';
import { registerAlgorithmRoutes } from './controllers/algorithms';

// Socket handler imports
import { registerSocketHandlers } from './sockets';

// Create Fastify instance with logging configuration
const server: FastifyInstance = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    ...(config.LOG_FORMAT === 'pretty' && config.NODE_ENV === 'development' 
      ? { 
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            }
          }
        } 
      : {}),
  },
  trustProxy: true,
});

// Initialize services
let serviceManager: ServiceManager;
let mockBroker: MockZMQBroker | null = null;
let io: SocketIOServer;

// Global error handler
server.setErrorHandler(async (error, request, reply) => {
  const { method, url } = request;
  
  request.log.error({
    error: {
      name: error.name,
      message: error.message,
      stack: config.NODE_ENV === 'development' ? error.stack : undefined,
    },
    method,
    url,
  }, 'Unhandled error occurred');

  let statusCode = 500;
  if (error.statusCode) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
  }

  const errorResponse = {
    success: false,
    error: error.name || 'Internal Server Error',
    message: statusCode >= 500 && config.NODE_ENV === 'production' 
      ? 'An internal error occurred' 
      : error.message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
  };

  reply.code(statusCode).send(errorResponse);
});

// Not found handler
server.setNotFoundHandler(async (request, reply) => {
  reply.code(404).send({
    success: false,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Initialize ZMQ services
async function initializeServices() {
  try {
    // Start mock broker if in development mode
    if (config.USE_MOCK_ZMQ === true) {
      server.log.info('Starting mock ZMQ broker...');
      mockBroker = new MockZMQBroker(
        config.ZMQ_BROKER_URL,
        'tcp://localhost:5556',
        server.log as any
      );
      await mockBroker.start();
      server.log.info('Mock ZMQ broker started');
    }

    // Initialize service manager
    serviceManager = new ServiceManager(
      {
        zmq: {
          brokerUrl: config.ZMQ_BROKER_URL,
          timeout: config.ZMQ_TIMEOUT,
          retries: config.ZMQ_RETRIES,
          heartbeatInterval: config.ZMQ_HEARTBEAT_INTERVAL,
          pythonPath: config.PYTHON_PATH,
          pythonScriptPath: config.PYTHON_SCRIPT_PATH,
          verbose: config.NODE_ENV === 'development',
        },
        auth: {
          jwtSecret: config.JWT_SECRET,
          jwtExpiresIn: config.JWT_EXPIRES_IN,
        },
      },
      server.log as any
    );

    // Start services
    await serviceManager.start();
    
    // Decorate Fastify instance with services
    server.decorate('services', serviceManager);
    
    server.log.info('ZMQ services initialized');
  } catch (error) {
    server.log.error({ error }, 'Failed to initialize services');
    throw error;
  }
}

// Register middleware and routes
async function registerPluginsAndRoutes() {
  try {
    // Register middleware (order matters)
    await registerLogging(server);
    await registerSecurity(server);
    await registerCors(server);
    await registerAuth(server);
    
    // Register API routes
    await server.register(async function(fastify) {
      await registerHealthRoutes(fastify);
    });
    
    await server.register(async function(fastify) {
      await registerAuthRoutes(fastify);
      await registerInstructionRoutes(fastify);
      await registerAccountRoutes(fastify);
      await registerAlgorithmRoutes(fastify);
    }, { prefix: '/api/v1' });
    
    server.log.info('All plugins and routes registered successfully');
    
  } catch (error) {
    server.log.error({ error }, 'Failed to register plugins and routes');
    throw error;
  }
}

// Initialize Socket.IO
function initializeSocketIO() {
  io = new SocketIOServer(server.server, {
    cors: {
      origin: config.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Register socket handlers
  registerSocketHandlers(io, serviceManager, server.log as any);
  
  server.log.info('Socket.IO initialized');
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close Socket.IO connections
    if (io) {
      io.close();
    }
    
    // Stop services
    if (serviceManager) {
      await serviceManager.stop();
    }
    
    // Stop mock broker
    if (mockBroker) {
      await mockBroker.stop();
    }
    
    // Close Fastify server
    await server.close();
    
    server.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    server.log.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  server.log.error({
    reason,
    promise,
  }, 'Unhandled promise rejection');
  
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
async function start() {
  try {
    // Initialize ZMQ services first
    await initializeServices();
    
    // Register all plugins and routes
    await registerPluginsAndRoutes();
    
    // Start listening
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    // Initialize Socket.IO after server is listening
    initializeSocketIO();
    
    server.log.info({
      port: config.PORT,
      host: config.HOST,
      environment: config.NODE_ENV,
      nodeVersion: process.version,
      useMockZMQ: config.USE_MOCK_ZMQ === true,
    }, 'API Gateway server started successfully');
    
    // Health check on startup
    try {
      const healthResponse = await server.inject({
        method: 'GET',
        url: '/health'
      });
      
      if (healthResponse.statusCode === 200) {
        server.log.info('Health check passed on startup');
      } else {
        server.log.warn({ statusCode: healthResponse.statusCode }, 'Health check failed on startup');
      }
    } catch (healthError) {
      server.log.warn({ error: healthError }, 'Unable to perform health check on startup');
    }
    
  } catch (error) {
    server.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    services: ServiceManager;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export server and services for testing
export { server, serviceManager };
export default server;