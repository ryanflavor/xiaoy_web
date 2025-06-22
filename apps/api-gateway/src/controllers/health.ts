import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../types/env';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    api: 'ok' | 'down';
    zmq: 'ok' | 'down' | 'unknown';
    database: 'ok' | 'down' | 'unknown';
    python: 'ok' | 'down' | 'unknown';
  };
  uptime: string;
  memory: {
    used: string;
    total: string;
    percentage: string;
  };
}

export async function registerHealthRoutes(fastify: FastifyInstance) {
  // Basic health check endpoint
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = process.hrtime.bigint();
    
    // Basic system metrics
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // TODO: Add actual service health checks
    const services = {
      api: 'ok' as const,
      zmq: 'unknown' as const, // Will be implemented in Story 0.4
      database: 'unknown' as const, // Will be implemented when DB integration is added
      python: 'unknown' as const, // Will be implemented in Story 0.4
    };
    
    // Determine overall status
    const serviceValues = Object.values(services) as Array<'ok' | 'down' | 'unknown'>;
    const hasDownServices = serviceValues.includes('down');
    const hasUnknownServices = serviceValues.includes('unknown');
    
    let status: 'ok' | 'degraded' | 'down';
    if (hasDownServices) {
      status = 'down';
    } else if (hasUnknownServices) {
      status = 'ok'; // For now, unknown services don't degrade status
    } else {
      status = 'ok';
    }
    
    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: '0.1.0', // TODO: Get from package.json
      environment: config.NODE_ENV,
      services,
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        percentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`,
      },
    };
    
    const responseTime = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
    
    reply
      .header('X-Response-Time', `${responseTime.toFixed(2)}ms`)
      .code(status === 'down' ? 503 : 200)
      .send(response);
  });

  // Detailed health check with authentication required
  fastify.get('/health/detailed', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // This endpoint provides more detailed system information
    // and requires authentication to prevent information disclosure
    
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const detailedResponse = {
      ...await getBasicHealthInfo(),
      details: {
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`,
        },
        cpu: {
          user: `${Math.round(cpuUsage.user / 1000)}ms`,
          system: `${Math.round(cpuUsage.system / 1000)}ms`,
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    };
    
    reply.send(detailedResponse);
  });

  // Ready check - for Kubernetes readiness probes
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    // This endpoint should return 200 only when the service is ready to accept traffic
    // For now, we'll just check if the service is running
    
    try {
      // TODO: Add checks for:
      // - Database connectivity
      // - ZMQ broker connectivity
      // - Python subprocess availability
      
      reply.code(200).send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error) {
      request.log.error({ error }, 'Readiness check failed');
      reply.code(503).send({ 
        status: 'not ready', 
        timestamp: new Date().toISOString(),
        error: 'Service not ready'
      });
    }
  });

  // Live check - for Kubernetes liveness probes
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    // This endpoint should return 200 as long as the process is alive
    reply.code(200).send({ status: 'alive', timestamp: new Date().toISOString() });
  });
}

// Helper function to get basic health info
async function getBasicHealthInfo(): Promise<Omit<HealthCheckResponse, 'details'>> {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: config.NODE_ENV,
    services: {
      api: 'ok',
      zmq: 'unknown',
      database: 'unknown', 
      python: 'unknown',
    },
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      percentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`,
    },
  };
}