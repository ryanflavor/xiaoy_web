// Shared TypeScript type definitions for Xiaoy Web Trading System

// ============================================================================
// Core System Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Authentication & Authorization
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<AuthTokens> {
  user: User;
}

// ============================================================================
// Trading System Core Types
// ============================================================================

export interface Account {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  isEnabled: boolean;
  balance: number;
  currency: string;
  riskLevel: number;
  lastUpdateTime: string;
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  direction: 'buy' | 'sell';
  quantity: number;
  price: number;
  unrealizedPnL: number;
  realizedPnL: number;
  margin: number;
  openTime: string;
}

export type InstructionType = 'vega' | 'single-delta' | 'dual-delta' | 'clear';

export interface ParsedInstruction {
  id: string;
  originalText: string;
  type: InstructionType;
  contracts: InstructionContract[];
  crossAccountRisk: number;
  timestamp: string;
}

export interface InstructionContract {
  contractName: string;
  volM: number;
  direction: 'buy' | 'sell' | 'long' | 'short';
  time: string;
  level: string;
  quantity: number;
  price: number;
  margin: number;
  cashD: number;
  cashV: number;
}

// ============================================================================
// Algorithm & Monitoring
// ============================================================================

export interface Algorithm {
  id: string;
  portfolioId: string;
  name: string;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  accounts: AlgorithmAccount[];
}

export interface AlgorithmAccount {
  accountId: string;
  accountName: string;
  progress: number;
  status: 'active' | 'paused' | 'error' | 'completed';
  orders: number;
  fills: number;
  errors: number;
}

export interface AlgorithmControl {
  action: 'pause' | 'continue' | 'stop' | 'end';
  algorithmId: string;
  reason?: string;
}

// ============================================================================
// Real-time Data & WebSocket
// ============================================================================

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
  channel?: string;
}

export interface AccountStatusUpdate {
  accountId: string;
  status: Account['status'];
  isEnabled: boolean;
  lastUpdateTime: string;
}

export interface AlgorithmProgressUpdate {
  algorithmId: string;
  progress: number;
  accountProgress: Record<string, number>;
  status: Algorithm['status'];
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  persistent: boolean;
  playSound: boolean;
}

// ============================================================================
// API Gateway & ZMQ Integration
// ============================================================================

export interface ZMQRequest {
  service: string;
  method: string;
  params: Record<string, any>;
  requestId: string;
  timestamp: string;
}

export interface ZMQResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// ============================================================================
// Environment & Configuration
// ============================================================================

export interface AppConfig {
  apiGateway: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  zmq: {
    brokerUrl: string;
    timeout: number;
    retries: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Type Guards
// ============================================================================

export const isApiResponse = <T>(value: any): value is ApiResponse<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.success === 'boolean' &&
    typeof value.timestamp === 'string'
  );
};

export const isWebSocketMessage = <T>(value: any): value is WebSocketMessage<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    typeof value.timestamp === 'string'
  );
};