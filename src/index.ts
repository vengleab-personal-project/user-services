import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
const app = createApp();

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server started successfully`, {
    port: config.port,
    environment: config.env,
    nodeVersion: process.version,
  });
  logger.info(`Health check: http://localhost:${config.port}/health`);
  logger.info(`API base URL: http://localhost:${config.port}/api`);
});

export default server;