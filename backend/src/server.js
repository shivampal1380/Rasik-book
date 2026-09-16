import { app, logger } from './app.js';
import { env } from './config/env.js';
import { prisma } from './utils/prisma.js';

async function start() {
  // Fail fast if DB is unreachable
  await prisma.$connect();
  logger.info('Connected to PostgreSQL');

  const server = app.listen(env.PORT, () => {
    logger.info(`Backend listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async signal => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Safety net if connections hang
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(err => {
  logger.error({ err }, 'Failed to start backend');
  process.exit(1);
});