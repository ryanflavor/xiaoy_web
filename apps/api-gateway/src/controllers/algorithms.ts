import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AlgorithmCommand } from '@xiaoy/zmq-protocol';

// Request schemas
const algorithmCommandSchema = z.object({
  command: z.nativeEnum(AlgorithmCommand),
});

export async function registerAlgorithmRoutes(fastify: FastifyInstance) {
  const { algorithm: algorithmService } = fastify.services;

  // Get all algorithms
  fastify.get('/algorithms', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const algorithms = await algorithmService.getAlgorithms();
      reply.send({ success: true, data: algorithms });
    } catch (error) {
      request.log.error({ error }, 'Failed to get algorithms');
      reply.code(500).send({
        success: false,
        error: 'Failed to get algorithms',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get algorithms by portfolio
  fastify.get('/algorithms/by-portfolio', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const algorithmsByPortfolio = await algorithmService.getAlgorithmsByPortfolio();
      reply.send({ success: true, data: algorithmsByPortfolio });
    } catch (error) {
      request.log.error({ error }, 'Failed to get algorithms by portfolio');
      reply.code(500).send({
        success: false,
        error: 'Failed to get algorithms by portfolio',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get specific algorithm
  fastify.get('/algorithms/:algorithmId', async (
    request: FastifyRequest<{ Params: { algorithmId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const algorithm = await algorithmService.getAlgorithm(request.params.algorithmId);
      if (!algorithm) {
        return reply.code(404).send({
          success: false,
          error: 'Algorithm not found',
        });
      }
      reply.send({ success: true, data: algorithm });
    } catch (error) {
      request.log.error({ error }, 'Failed to get algorithm');
      reply.code(500).send({
        success: false,
        error: 'Failed to get algorithm',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Send command to algorithm
  fastify.post('/algorithms/:algorithmId/command', {
    schema: {
      body: algorithmCommandSchema,
    },
  }, async (
    request: FastifyRequest<{ 
      Params: { algorithmId: string };
      Body: z.infer<typeof algorithmCommandSchema>;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await algorithmService.sendCommand(
        request.params.algorithmId,
        request.body.command
      );
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to send algorithm command');
      reply.code(500).send({
        success: false,
        error: 'Failed to send algorithm command',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Convenience endpoints for specific commands
  fastify.post('/algorithms/:algorithmId/pause', async (
    request: FastifyRequest<{ Params: { algorithmId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await algorithmService.pauseAlgorithm(request.params.algorithmId);
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to pause algorithm');
      reply.code(500).send({
        success: false,
        error: 'Failed to pause algorithm',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/algorithms/:algorithmId/resume', async (
    request: FastifyRequest<{ Params: { algorithmId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await algorithmService.resumeAlgorithm(request.params.algorithmId);
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to resume algorithm');
      reply.code(500).send({
        success: false,
        error: 'Failed to resume algorithm',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/algorithms/:algorithmId/stop', async (
    request: FastifyRequest<{ Params: { algorithmId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await algorithmService.stopAlgorithm(request.params.algorithmId);
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to stop algorithm');
      reply.code(500).send({
        success: false,
        error: 'Failed to stop algorithm',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/algorithms/:algorithmId/end', async (
    request: FastifyRequest<{ Params: { algorithmId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await algorithmService.endAlgorithm(request.params.algorithmId);
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to end algorithm');
      reply.code(500).send({
        success: false,
        error: 'Failed to end algorithm',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get algorithm history
  fastify.get('/algorithms/history', {
    schema: {
      querystring: z.object({
        portfolioId: z.string().optional(),
        startTime: z.coerce.number().optional(),
        endTime: z.coerce.number().optional(),
        limit: z.coerce.number().int().min(1).max(1000).default(100),
      }),
    },
  }, async (
    request: FastifyRequest<{ 
      Querystring: { 
        portfolioId?: string; 
        startTime?: number; 
        endTime?: number; 
        limit: number;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { portfolioId, startTime, endTime, limit } = request.query;
      const history = await algorithmService.getAlgorithmHistory(
        portfolioId,
        startTime,
        endTime,
        limit
      );
      reply.send({ success: true, data: history });
    } catch (error) {
      request.log.error({ error }, 'Failed to get algorithm history');
      reply.code(500).send({
        success: false,
        error: 'Failed to get algorithm history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get algorithm logs
  fastify.get('/algorithms/:algorithmId/logs', {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(1000).default(100),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }, async (
    request: FastifyRequest<{ 
      Params: { algorithmId: string };
      Querystring: { limit: number; offset: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit, offset } = request.query;
      const logs = await algorithmService.getAlgorithmLogs(
        request.params.algorithmId,
        limit,
        offset
      );
      reply.send({ success: true, data: logs });
    } catch (error) {
      request.log.error({ error }, 'Failed to get algorithm logs');
      reply.code(500).send({
        success: false,
        error: 'Failed to get algorithm logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}