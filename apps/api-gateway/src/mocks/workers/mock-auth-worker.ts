import { BaseMockWorker } from './base-mock-worker';
import { Logger } from 'pino';

export class MockAuthWorker extends BaseMockWorker {
  private mockUsers = [
    {
      id: 'user1',
      username: 'trader1',
      password: 'password123', // In real system, this would be hashed
      permissions: ['trade', 'view_accounts', 'manage_algorithms'],
      active: true,
    },
    {
      id: 'user2',
      username: 'admin',
      password: 'admin123',
      permissions: ['*'], // Admin has all permissions
      active: true,
    },
  ];

  constructor(brokerUrl: string, logger: Logger) {
    super('auth_service', brokerUrl, logger);
  }

  protected async handleServiceCall(
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<any> {
    switch (method) {
      case 'authenticate':
        return this.authenticate(kwargs);
      
      case 'verify_user':
        return this.verifyUser(args[0]);
      
      case 'logout':
        return this.logout(args[0]);
      
      case 'change_password':
        return this.changePassword(kwargs);
      
      case 'get_user_permissions':
        return this.getUserPermissions(args[0]);
      
      case 'ping':
        return 'pong';
      
      case 'get_health':
        return { healthy: true, message: 'Mock auth service is healthy' };
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private authenticate(kwargs: any) {
    const { username, password } = kwargs;
    
    const user = this.mockUsers.find(
      u => u.username === username && u.password === password
    );
    
    if (user) {
      return {
        success: true,
        user_id: user.id,
        username: user.username,
        permissions: user.permissions,
      };
    }
    
    return {
      success: false,
      message: 'Invalid username or password',
    };
  }

  private verifyUser(userId: string) {
    const user = this.mockUsers.find(u => u.id === userId);
    
    if (user) {
      return {
        active: user.active,
        permissions: user.permissions,
      };
    }
    
    return {
      active: false,
    };
  }

  private logout(userId: string) {
    return {
      success: true,
      message: `User ${userId} logged out`,
    };
  }

  private changePassword(kwargs: any) {
    const { user_id, old_password, new_password } = kwargs;
    
    const user = this.mockUsers.find(u => u.id === user_id);
    
    if (user && user.password === old_password) {
      user.password = new_password;
      return {
        success: true,
        message: 'Password changed successfully',
      };
    }
    
    return {
      success: false,
      message: 'Invalid old password',
    };
  }

  private getUserPermissions(userId: string) {
    const user = this.mockUsers.find(u => u.id === userId);
    
    return {
      permissions: user?.permissions || [],
    };
  }
}