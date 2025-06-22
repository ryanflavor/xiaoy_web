import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Request schemas
const parseInstructionSchema = z.object({
  text: z.string().min(1).max(500),
  accounts: z.array(z.string()).min(1),
  timestamp: z.number().optional(),
});

const executeInstructionSchema = z.object({
  instructions: z.array(z.any()), // Will be validated by service
  accounts: z.array(z.string()).min(1),
  dryRun: z.boolean().optional(),
});

export async function registerInstructionRoutes(fastify: FastifyInstance) {
  const { instruction: instructionService } = fastify.services;

  // Parse instruction endpoint
  fastify.post('/instructions/parse', {
    schema: {
      body: parseInstructionSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            instructions: { type: 'array' },
            errors: { type: 'array' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof parseInstructionSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await instructionService.parseInstructions(request.body);
      reply.send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to parse instructions');
      reply.code(500).send({
        success: false,
        error: 'Failed to parse instructions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Execute instructions endpoint
  fastify.post('/instructions/execute', {
    schema: {
      body: executeInstructionSchema,
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof executeInstructionSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await instructionService.executeInstructions(request.body);
      reply.send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to execute instructions');
      reply.code(500).send({
        success: false,
        error: 'Failed to execute instructions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get execution status
  fastify.get('/instructions/execution/:executionId', async (
    request: FastifyRequest<{ Params: { executionId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await instructionService.getExecutionStatus(request.params.executionId);
      reply.send({ success: true, data: result });
    } catch (error) {
      request.log.error({ error }, 'Failed to get execution status');
      reply.code(500).send({
        success: false,
        error: 'Failed to get execution status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Cancel execution
  fastify.delete('/instructions/execution/:executionId', async (
    request: FastifyRequest<{ Params: { executionId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await instructionService.cancelExecution(request.params.executionId);
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to cancel execution');
      reply.code(500).send({
        success: false,
        error: 'Failed to cancel execution',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get instruction history
  fastify.get('/instructions/history', {
    schema: {
      querystring: z.object({
        accounts: z.string().transform(s => s.split(',')),
        limit: z.coerce.number().int().min(1).max(1000).default(100),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }, async (
    request: FastifyRequest<{ 
      Querystring: { accounts: string[]; limit: number; offset: number } 
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { accounts, limit, offset } = request.query;
      const history = await instructionService.getInstructionHistory(accounts, limit, offset);
      reply.send({ success: true, data: history });
    } catch (error) {
      request.log.error({ error }, 'Failed to get instruction history');
      reply.code(500).send({
        success: false,
        error: 'Failed to get instruction history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}