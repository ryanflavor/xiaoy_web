#!/usr/bin/env ts-node

import * as pino from 'pino';
import { MockZMQBroker } from '../src/mocks';

const logger = pino.pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

async function startMockBroker() {
  const broker = new MockZMQBroker(
    'tcp://localhost:5555',
    'tcp://localhost:5556',
    logger
  );

  try {
    await broker.start();
    logger.info('Mock ZMQ broker is running');
    
    // Simulate some market data publishing
    setInterval(() => {
      broker.publish('market.500', {
        symbol: '沪500',
        price: 5.123,
        timestamp: Date.now(),
        bid: 5.120,
        ask: 5.126,
        volume: 12345,
      });
    }, 5000);
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down mock broker...');
      await broker.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to start mock broker');
    process.exit(1);
  }
}

startMockBroker();