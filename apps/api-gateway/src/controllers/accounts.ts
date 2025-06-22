import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Request schemas
const setAccountEnabledSchema = z.object({
  enabled: z.boolean(),
});

export async function registerAccountRoutes(fastify: FastifyInstance) {
  const { account: accountService } = fastify.services;

  // Get all accounts
  fastify.get('/accounts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const accounts = await accountService.getAccounts();
      reply.send({ success: true, data: accounts });
    } catch (error) {
      request.log.error({ error }, 'Failed to get accounts');
      reply.code(500).send({
        success: false,
        error: 'Failed to get accounts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get specific account
  fastify.get('/accounts/:accountId', async (
    request: FastifyRequest<{ Params: { accountId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const account = await accountService.getAccount(request.params.accountId);
      if (!account) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }
      reply.send({ success: true, data: account });
    } catch (error) {
      request.log.error({ error }, 'Failed to get account');
      reply.code(500).send({
        success: false,
        error: 'Failed to get account',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get account positions
  fastify.get('/accounts/:accountId/positions', async (
    request: FastifyRequest<{ Params: { accountId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const positions = await accountService.getPositions(request.params.accountId);
      reply.send({ success: true, data: positions });
    } catch (error) {
      request.log.error({ error }, 'Failed to get positions');
      reply.code(500).send({
        success: false,
        error: 'Failed to get positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get account risk metrics
  fastify.get('/accounts/:accountId/risk', async (
    request: FastifyRequest<{ Params: { accountId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const risk = await accountService.getRiskMetrics(request.params.accountId);
      if (!risk) {
        return reply.code(404).send({
          success: false,
          error: 'Risk metrics not found',
        });
      }
      reply.send({ success: true, data: risk });
    } catch (error) {
      request.log.error({ error }, 'Failed to get risk metrics');
      reply.code(500).send({
        success: false,
        error: 'Failed to get risk metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Enable/disable account
  fastify.patch('/accounts/:accountId/enabled', {
    schema: {
      body: setAccountEnabledSchema,
    },
  }, async (
    request: FastifyRequest<{ 
      Params: { accountId: string };
      Body: z.infer<typeof setAccountEnabledSchema>;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const success = await accountService.setAccountEnabled(
        request.params.accountId,
        request.body.enabled
      );
      reply.send({ success });
    } catch (error) {
      request.log.error({ error }, 'Failed to set account status');
      reply.code(500).send({
        success: false,
        error: 'Failed to set account status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Verify account positions
  fastify.post('/accounts/:accountId/verify', async (
    request: FastifyRequest<{ Params: { accountId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await accountService.verifyPositions(request.params.accountId);
      reply.send({ success: true, data: result });
    } catch (error) {
      request.log.error({ error }, 'Failed to verify positions');
      reply.code(500).send({
        success: false,
        error: 'Failed to verify positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get account transaction history
  fastify.get('/accounts/:accountId/transactions', {
    schema: {
      querystring: z.object({
        startTime: z.coerce.number().optional(),
        endTime: z.coerce.number().optional(),
        limit: z.coerce.number().int().min(1).max(1000).default(100),
      }),
    },
  }, async (
    request: FastifyRequest<{ 
      Params: { accountId: string };
      Querystring: { startTime?: number; endTime?: number; limit: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { startTime, endTime, limit } = request.query;
      const transactions = await accountService.getTransactionHistory(
        request.params.accountId,
        startTime,
        endTime,
        limit
      );
      reply.send({ success: true, data: transactions });
    } catch (error) {
      request.log.error({ error }, 'Failed to get transaction history');
      reply.code(500).send({
        success: false,
        error: 'Failed to get transaction history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}