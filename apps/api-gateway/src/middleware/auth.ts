import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { config } from '../types/env';
import { User } from '@xiaoy/shared-types';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export interface JWTPayload {
  userId: string;
  username: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export class AuthenticationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

export async function registerAuth(fastify: FastifyInstance) {
  // JWT verification utility
  fastify.decorate('verifyJWT', async function(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token', 401);
      }
      throw new AuthenticationError('Token verification failed', 401);
    }
  });

  // JWT signing utility
  fastify.decorate('signJWT', function(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload as Record<string, any>, config.JWT_SECRET, {
      expiresIn: '24h',
    });
  });

  // Authentication hook decorator
  fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        throw new AuthenticationError('Missing authorization header');
      }

      const [scheme, token] = authHeader.split(' ');
      
      if (scheme !== 'Bearer' || !token) {
        throw new AuthenticationError('Invalid authorization format');
      }

      // Verify JWT token
      const payload = await fastify.verifyJWT(token);
      
      // TODO: In a real implementation, you might want to:
      // 1. Check if the session is still valid in the database
      // 2. Load additional user information
      // 3. Verify user permissions
      
      // For now, create a minimal user object from JWT payload
      request.user = {
        id: payload.userId,
        username: payload.username,
        email: '', // TODO: Add to JWT payload or fetch from DB
        roles: [], // TODO: Add to JWT payload or fetch from DB
        permissions: [], // TODO: Add to JWT payload or fetch from DB
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        reply.code(error.statusCode).send({
          error: 'Authentication Failed',
          message: error.message,
          statusCode: error.statusCode,
        });
        return;
      }
      
      request.log.error({ error }, 'Authentication error');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authentication processing failed',
        statusCode: 500,
      });
    }
  });
}

// Declare extended Fastify instance types
declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT(token: string): Promise<JWTPayload>;
    signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}