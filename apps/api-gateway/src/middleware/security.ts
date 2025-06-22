import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from '../types/env';

export async function registerSecurity(fastify: FastifyInstance) {
  // Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    keyGenerator: (request) => {
      // Use IP address as key, but also consider user ID if authenticated
      const forwarded = request.headers['x-forwarded-for'] as string;
      const ip = forwarded ? forwarded.split(',')[0] : request.ip;
      
      // If user is authenticated, use user ID for rate limiting
      const userId = (request as any).user?.id;
      return userId ? `user:${userId}` : `ip:${ip}`;
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        statusCode: 429,
        retryAfter: Math.round(context.ttl / 1000),
      };
    },
  });
}