import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoginRequest, LoginResponse, ApiResponse } from '@xiaoy/shared-types';
import { config } from '../types/env';

// Request/Response schemas for validation
const loginSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 1 },
      password: { type: 'string', minLength: 1 },
    },
  },
};

const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', minLength: 1 },
    },
  },
};

export async function registerAuthRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post<{ Body: LoginRequest }>('/auth/login', {
    schema: loginSchema,
  }, async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
    const { username, password } = request.body;
    
    try {
      // TODO: In Story 0.4, this will integrate with the existing authentication system
      // For now, we'll implement a stub that validates against hardcoded credentials
      
      // Stub authentication logic
      if (username === 'admin' && password === 'password') {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate JWT token
        const accessToken = fastify.signJWT({
          userId: 'user_1',
          username: username,
          sessionId: sessionId,
        });
        
        // TODO: Generate refresh token (implement in future iteration)
        const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
        
        const response: LoginResponse = {
          success: true,
          data: {
            accessToken,
            refreshToken,
            expiresIn: 24 * 60 * 60, // 24 hours in seconds
            tokenType: 'Bearer',
          },
          user: {
            id: 'user_1',
            username: username,
            email: 'admin@xiaoy.com',
            roles: ['admin'],
            permissions: ['*'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        
        request.log.info({ username, sessionId }, 'User logged in successfully');
        reply.code(200).send(response);
        
      } else {
        // Invalid credentials
        const errorResponse: ApiResponse = {
          success: false,
          error: 'Invalid username or password',
          timestamp: new Date().toISOString(),
        };
        
        request.log.warn({ username }, 'Login attempt with invalid credentials');
        reply.code(401).send(errorResponse);
      }
      
    } catch (error) {
      request.log.error({ error, username }, 'Login error');
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Authentication service error',
        timestamp: new Date().toISOString(),
      };
      
      reply.code(500).send(errorResponse);
    }
  });

  // Token validation endpoint
  fastify.post('/auth/validate', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // If we reach here, the token is valid (authentication middleware passed)
    const response: ApiResponse<{ user: any }> = {
      success: true,
      data: {
        user: request.user,
      },
      timestamp: new Date().toISOString(),
    };
    
    reply.send(response);
  });

  // Token refresh endpoint (stub implementation)
  fastify.post('/auth/refresh', {
    schema: refreshSchema,
  }, async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
    const { refreshToken } = request.body;
    
    try {
      // TODO: Implement proper refresh token validation
      // For now, just return an error since we don't have refresh token storage
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Refresh token functionality not yet implemented',
        timestamp: new Date().toISOString(),
      };
      
      reply.code(501).send(errorResponse);
      
    } catch (error) {
      request.log.error({ error }, 'Token refresh error');
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Token refresh service error',
        timestamp: new Date().toISOString(),
      };
      
      reply.code(500).send(errorResponse);
    }
  });

  // Logout endpoint
  fastify.post('/auth/logout', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: In a real implementation, you would:
    // 1. Invalidate the JWT token (add to blacklist)
    // 2. Remove the refresh token from storage
    // 3. Update session status in database
    
    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString(),
    };
    
    request.log.info({ userId: request.user?.id }, 'User logged out');
    reply.send(response);
  });
}