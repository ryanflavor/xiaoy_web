// ZMQ Protocol handlers and type definitions
// Implements ZMQ Majordomo Protocol for communication with existing Python backend

import { ZMQRequest, ZMQResponse } from '@xiaoy/shared-types';

// ============================================================================
// ZMQ Majordomo Protocol Constants
// ============================================================================

export const MDP = {
  // Protocol version
  VERSION: '0.2.0',
  
  // Message types
  CLIENT: 'MDPC01',
  WORKER: 'MDPW01',
  
  // Commands
  READY: '\x01',
  REQUEST: '\x02',
  REPLY: '\x03',
  HEARTBEAT: '\x04',
  DISCONNECT: '\x05',
  
  // Client commands
  CLIENT_READY: '\x01',
  CLIENT_PARTIAL: '\x02',
  CLIENT_FINAL: '\x03',
} as const;

// ============================================================================
// ZMQ Message Types
// ============================================================================

export interface MDPMessage {
  header: string;
  type: string;
  service?: string;
  body: Buffer[];
}

export interface ZMQClientConfig {
  brokerUrl: string;
  timeout: number;
  retries: number;
  heartbeatInterval: number;
  reconnectInterval: number;
}

export const DEFAULT_ZMQ_CONFIG: ZMQClientConfig = {
  brokerUrl: 'tcp://localhost:5555',
  timeout: 5000,
  retries: 3,
  heartbeatInterval: 2500,
  reconnectInterval: 2500,
};

// ============================================================================
// Service Method Definitions
// ============================================================================

export type ServiceMethod = 
  | 'auth.login'
  | 'auth.validate'
  | 'auth.refresh'
  | 'account.list'
  | 'account.status'
  | 'account.positions'
  | 'algorithm.list'
  | 'algorithm.status'
  | 'algorithm.control'
  | 'instruction.parse'
  | 'instruction.validate'
  | 'instruction.preview'
  | 'instruction.execute'
  | 'market.subscribe'
  | 'market.unsubscribe';

export interface ServiceRequest {
  method: ServiceMethod;
  params: Record<string, any>;
  requestId: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface ServiceResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// ============================================================================
// Authentication Service Types
// ============================================================================

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  userId: string;
  username: string;
  sessionId: string;
  permissions: string[];
  expiresAt: string;
}

export interface AuthValidateRequest {
  sessionId: string;
}

export interface AuthValidateResponse {
  valid: boolean;
  userId?: string;
  expiresAt?: string;
}

// ============================================================================
// Account Service Types
// ============================================================================

export interface AccountListRequest {
  userId: string;
  includeDisabled?: boolean;
}

export interface AccountStatusRequest {
  userId: string;
  accountIds?: string[];
}

export interface AccountPositionsRequest {
  userId: string;
  accountId: string;
  symbol?: string;
}

// ============================================================================
// Algorithm Service Types
// ============================================================================

export interface AlgorithmListRequest {
  userId: string;
  portfolioId?: string;
  status?: string[];
}

export interface AlgorithmStatusRequest {
  userId: string;
  algorithmIds: string[];
}

export interface AlgorithmControlRequest {
  userId: string;
  algorithmId: string;
  action: 'pause' | 'continue' | 'stop' | 'end';
  reason?: string;
}

// ============================================================================
// Instruction Service Types
// ============================================================================

export interface InstructionParseRequest {
  userId: string;
  instruction: string;
  accountIds?: string[];
}

export interface InstructionValidateRequest {
  userId: string;
  instruction: string;
}

export interface InstructionPreviewRequest {
  userId: string;
  instruction: string;
  accountIds: string[];
}

export interface InstructionExecuteRequest {
  userId: string;
  instructionId: string;
  accountIds: string[];
  confirmRisk: boolean;
}

// ============================================================================
// Market Data Service Types
// ============================================================================

export interface MarketSubscribeRequest {
  userId: string;
  symbols: string[];
  dataTypes: string[];
}

export interface MarketUnsubscribeRequest {
  userId: string;
  symbols?: string[];
  dataTypes?: string[];
}

// ============================================================================
// Protocol Message Builders
// ============================================================================

export class ZMQProtocolHelper {
  static createRequest(
    service: string,
    method: ServiceMethod,
    params: Record<string, any>,
    requestId?: string
  ): ServiceRequest {
    return {
      method,
      params,
      requestId: requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }

  static createResponse(
    requestId: string,
    success: boolean,
    data?: any,
    error?: ServiceResponse['error']
  ): ServiceResponse {
    return {
      requestId,
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static serializeMessage(message: ServiceRequest | ServiceResponse): Buffer {
    // In production, this would use Python pickle format for compatibility
    // For now, using JSON as placeholder
    return Buffer.from(JSON.stringify(message), 'utf8');
  }

  static deserializeMessage(buffer: Buffer): ServiceRequest | ServiceResponse {
    // In production, this would deserialize Python pickle format
    // For now, using JSON as placeholder
    return JSON.parse(buffer.toString('utf8'));
  }

  static validateMessage(message: any): boolean {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.requestId === 'string' &&
      typeof message.timestamp === 'string'
    );
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class ZMQProtocolError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ZMQProtocolError';
  }
}

export class ZMQTimeoutError extends ZMQProtocolError {
  constructor(requestId: string, timeout: number) {
    super(`Request ${requestId} timed out after ${timeout}ms`, 'TIMEOUT');
  }
}

export class ZMQConnectionError extends ZMQProtocolError {
  constructor(brokerUrl: string, originalError?: Error) {
    super(`Failed to connect to ZMQ broker at ${brokerUrl}`, 'CONNECTION_FAILED', originalError);
  }
}

export class ZMQServiceError extends ZMQProtocolError {
  constructor(service: string, method: string, error: string) {
    super(`Service ${service}.${method} failed: ${error}`, 'SERVICE_ERROR');
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export const isServiceRequest = (value: any): value is ServiceRequest => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.method === 'string' &&
    typeof value.params === 'object' &&
    typeof value.requestId === 'string' &&
    typeof value.timestamp === 'string'
  );
};

export const isServiceResponse = (value: any): value is ServiceResponse => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.requestId === 'string' &&
    typeof value.success === 'boolean' &&
    typeof value.timestamp === 'string'
  );
};

// ============================================================================
// Default Exports
// ============================================================================

export { ZMQProtocolHelper as ZMQ };
export default ZMQProtocolHelper;