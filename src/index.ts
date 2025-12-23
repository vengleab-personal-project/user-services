import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();

// Export for Vercel/serverless handler
export default app;

// Only start a local listener when not running in Vercel/serverless mode
if (!process.env.VERCEL && !process.env.VERCEL_DEV) {
  app.listen(config.port, () => {
    logger.info(`Server started successfully`, {
      port: config.port,
      environment: config.env,
      nodeVersion: process.version,
    });
    logger.info(`Health check: http://localhost:${config.port}/health`);
    logger.info(`API base URL: http://localhost:${config.port}/api`);
  });
}