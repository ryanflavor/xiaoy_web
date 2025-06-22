import { BaseService } from './base-service';
import { AuthResponse } from '@xiaoy/zmq-protocol';
import * as jwt from 'jsonwebtoken';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  permissions: string[];
  exp?: number;
}

export class AuthService extends BaseService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor(zmqClient: any, logger: any, jwtSecret: string, jwtExpiresIn: string = '24h') {
    super('auth_service', zmqClient, logger);
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
  }

  /**
   * Login user and get JWT token
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      // Call backend authentication service
      const result = await this.call('authenticate', [], {
        username: request.username,
        password: request.password,
      });

      if (!result || !result.success) {
        return {
          success: false,
          message: result?.message || 'Authentication failed',
        };
      }

      // Generate JWT token
      const tokenPayload: TokenPayload = {
        userId: result.user_id || result.userId,
        username: result.username,
        permissions: result.permissions || [],
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
      });

      return {
        success: true,
        token,
        user: {
          id: tokenPayload.userId,
          username: tokenPayload.username,
          permissions: tokenPayload.permissions,
        },
      };
    } catch (error) {
      this.logger.error({ error, username: request.username }, 'Login failed');
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return payload;
    } catch (error) {
      this.logger.debug({ error }, 'Token validation failed');
      return null;
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(oldToken: string): Promise<AuthResponse> {
    const payload = this.validateToken(oldToken);
    
    if (!payload) {
      return {
        success: false,
        message: 'Invalid token',
      };
    }

    try {
      // Verify user still exists and is active
      const result = await this.call('verify_user', [payload.userId]);
      
      if (!result || !result.active) {
        return {
          success: false,
          message: 'User not found or inactive',
        };
      }

      // Generate new token
      const newPayload: TokenPayload = {
        userId: payload.userId,
        username: payload.username,
        permissions: result.permissions || payload.permissions,
      };

      const token = jwt.sign(newPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
      });

      return {
        success: true,
        token,
        user: {
          id: newPayload.userId,
          username: newPayload.username,
          permissions: newPayload.permissions,
        },
      };
    } catch (error) {
      this.logger.error({ error, userId: payload.userId }, 'Token refresh failed');
      
      return {
        success: false,
        message: 'Failed to refresh token',
      };
    }
  }

  /**
   * Logout user (invalidate session on backend)
   */
  async logout(userId: string): Promise<boolean> {
    try {
      const result = await this.call('logout', [userId]);
      return result?.success ?? true;
    } catch (error) {
      this.logger.error({ error, userId }, 'Logout failed');
      return false;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string, 
    oldPassword: string, 
    newPassword: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      return await this.call('change_password', [], {
        user_id: userId,
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      this.logger.error({ error, userId }, 'Password change failed');
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Password change failed',
      };
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const result = await this.call('get_user_permissions', [userId]);
      return result?.permissions || [];
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user permissions');
      return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permissions: string[], requiredPermission: string): boolean {
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }

  /**
   * Extract token from authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    
    return null;
  }
}