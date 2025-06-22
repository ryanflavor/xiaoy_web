import Fastify, { FastifyInstance } from 'fastify';
import { config } from './types/env';

// Middleware imports
import { registerCors } from './middleware/cors';
import { registerSecurity } from './middleware/security';
import { registerLogging } from './middleware/logging';
import { registerAuth } from './middleware/auth';

// Controller imports
import { registerHealthRoutes } from './controllers/health';
import { registerAuthRoutes } from './controllers/auth';

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
  trustProxy: true, // Enable if behind a proxy (nginx, load balancer, etc.)
});

// Global error handler
server.setErrorHandler(async (error, request, reply) => {
  const { method, url } = request;
  
  // Log the error
  request.log.error({
    error: {
      name: error.name,
      message: error.message,
      stack: config.NODE_ENV === 'development' ? error.stack : undefined,
    },
    method,
    url,
  }, 'Unhandled error occurred');

  // Determine status code
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

  // Send error response
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
    }, { prefix: '/api/v1' });
    
    // TODO: Register additional route groups in future stories:
    // - Instruction parsing routes (Story 1.1)
    // - Account management routes (Story 1.2)
    // - Algorithm monitoring routes (Story 1.3)
    // - Real-time WebSocket handlers (Story 1.4)
    
    server.log.info('All plugins and routes registered successfully');
    
  } catch (error) {
    server.log.error({ error }, 'Failed to register plugins and routes');
    throw error;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
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
  
  // In production, you might want to exit the process
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
async function start() {
  try {
    // Register all plugins and routes
    await registerPluginsAndRoutes();
    
    // Start listening
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    server.log.info({
      port: config.PORT,
      host: config.HOST,
      environment: config.NODE_ENV,
      nodeVersion: process.version,
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

// Start the server if this file is run directly
if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export server for testing
export { server };
export default server;