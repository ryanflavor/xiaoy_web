import { z } from 'zod';

// Environment variables schema with validation
export const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  
  // CORS Configuration
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // ZMQ Configuration
  ZMQ_BROKER_URL: z.string().default('tcp://localhost:5555'),
  ZMQ_TIMEOUT: z.coerce.number().min(1000).default(5000),
  ZMQ_RETRIES: z.coerce.number().min(1).default(3),
  ZMQ_HEARTBEAT_INTERVAL: z.coerce.number().min(1000).default(2500),
  
  // Database Configuration (for authentication)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().min(1).max(65535).default(3306),
  DB_USERNAME: z.string().default('trading_user'),
  DB_PASSWORD: z.string().default('trading_password'),
  DB_DATABASE: z.string().default('trading_system'),
  
  // Python Integration
  PYTHON_PATH: z.string().default('python3'),
  PYTHON_SCRIPT_PATH: z.string().default('./python-scripts'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  
  // Mock Services
  USE_MOCK_ZMQ: z.string().transform(val => val === 'true').default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate and parse environment variables
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();