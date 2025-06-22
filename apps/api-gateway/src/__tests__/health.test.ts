import { FastifyInstance } from 'fastify';
import { server } from '../server';

describe('Health Check Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = server;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|down)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        services: {
          api: 'ok',
          zmq: 'unknown',
          database: 'unknown',
          python: 'unknown',
        },
        uptime: expect.any(String),
        memory: {
          used: expect.any(String),
          total: expect.any(String),
          percentage: expect.any(String),
        },
      });
    });

    it('should include response time header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['x-response-time']).toMatch(/\d+\.\d+ms/);
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /live', () => {
    it('should return liveness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /health/detailed', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return detailed health info when authenticated', async () => {
      // First, get a token by logging in
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'admin',
          password: 'password'
        }
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginBody = JSON.parse(loginResponse.body);
      const token = loginBody.data.accessToken;

      // Now use the token to access detailed health info
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|down)$/),
        details: {
          memory: expect.any(Object),
          cpu: expect.any(Object),
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
          pid: expect.any(Number),
        },
      });
    });
  });
});