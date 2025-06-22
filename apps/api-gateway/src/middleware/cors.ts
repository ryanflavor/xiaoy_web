import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../types/env';

export async function registerCors(fastify: FastifyInstance) {
  const origins = config.CORS_ORIGINS.split(',').map(origin => origin.trim());
  
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in our allowed list
      if (origins.includes(origin) || origins.includes('*')) {
        return callback(null, true);
      }
      
      // For development, be more permissive
      if (config.NODE_ENV === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });
}