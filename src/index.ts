import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

await prisma.$queryRaw`SELECT 1`; // fail fast if the database is unreachable
logger.info('Database connection OK');

// Creates app
const server = createApp().listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
