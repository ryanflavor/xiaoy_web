import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../types/env';

export async function registerLogging(fastify: FastifyInstance) {
  // Configure Fastify built-in logger
  const loggerConfig = {
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
  };

  // Request/Response logging hook
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'Incoming request');
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = reply.getResponseTime();
    
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: reply.getHeader('content-length'),
    }, 'Request completed');
  });

  // Error logging hook
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    request.log.error({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      error: {
        name: error.name,
        message: error.message,
        stack: config.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }, 'Request error');
  });
}