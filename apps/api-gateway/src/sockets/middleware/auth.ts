import { Socket } from 'socket.io';
import { AuthService } from '../../services/auth-service';

export async function authMiddleware(
  socket: Socket,
  next: (err?: any) => void,
  authService: AuthService
) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Extract token if it includes Bearer prefix
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Validate token
    const payload = authService.validateToken(actualToken);
    
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    // Attach user data to socket
    socket.data = {
      userId: payload.userId,
      username: payload.username,
      permissions: payload.permissions,
    };

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}