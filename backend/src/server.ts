import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function main() {
  await connectDb();

  const app = createApp();
  // Express 5 reports listen failures (e.g. EADDRINUSE) through the callback, not by throwing.
  const server = app.listen(env.PORT, (err?: Error) => {
    if (err) {
      logger.fatal({ err }, `Could not listen on port ${env.PORT}`);
      process.exit(1);
    }
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Force-exit if open connections keep the server alive too long.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start the API');
  process.exit(1);
});
