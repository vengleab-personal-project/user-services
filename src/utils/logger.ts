import winston from 'winston';
import { config } from '../config';

/**
 * Enhanced Logger Utility
 * 
 * This logger automatically handles circular references in error objects and metadata,
 * preventing "Converting circular structure to JSON" errors.
 * 
 * Usage:
 * ```typescript
 * import { logger } from './utils/logger';
 * 
 * try {
 *   // your code
 * } catch (error) {
 *   // No need to manually serialize error - logger handles it automatically
 *   logger.error('Operation failed', { error, userId, otherContext });
 * }
 * ```
 * 
 * Features:
 * - Automatically serializes Error objects (message, stack, name)
 * - Detects and handles circular references
 * - Preserves all non-circular metadata
 * - Works seamlessly with Express req/res objects in errors
 */

/**
 * Safely serialize error objects to prevent circular reference issues
 */
function serializeError(error: any): any {
  if (error instanceof Error) {
    const serialized: any = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
    // Check for error cause (ES2022 feature)
    if ('cause' in error && error.cause) {
      serialized.cause = serializeError(error.cause);
    }
    return serialized;
  }
  return String(error);
}

/**
 * Sanitize metadata to prevent circular reference issues
 * This recursively processes objects and handles common circular reference patterns
 */
function sanitizeMetadata(meta: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'error' && (value instanceof Error || (typeof value === 'object' && value !== null))) {
      // Handle error objects specially
      sanitized[key] = serializeError(value);
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else if (typeof value === 'object') {
      // Check for circular references by trying to stringify
      try {
        JSON.stringify(value);
        sanitized[key] = value;
      } catch (error) {
        // If we get a circular reference error, convert to string representation
        if (error instanceof TypeError && error.message.includes('circular')) {
          sanitized[key] = '[Circular Reference]';
        } else {
          sanitized[key] = String(value);
        }
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const winstonLogger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: config.env === 'production' ? logFormat : consoleFormat,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * Wrapped logger that automatically sanitizes metadata to prevent circular reference errors
 */
export const logger = {
  error: (message: string, meta?: Record<string, any>) => {
    winstonLogger.error(message, meta ? sanitizeMetadata(meta) : {});
  },
  warn: (message: string, meta?: Record<string, any>) => {
    winstonLogger.warn(message, meta ? sanitizeMetadata(meta) : {});
  },
  info: (message: string, meta?: Record<string, any>) => {
    winstonLogger.info(message, meta ? sanitizeMetadata(meta) : {});
  },
  debug: (message: string, meta?: Record<string, any>) => {
    winstonLogger.debug(message, meta ? sanitizeMetadata(meta) : {});
  },
  verbose: (message: string, meta?: Record<string, any>) => {
    winstonLogger.verbose(message, meta ? sanitizeMetadata(meta) : {});
  },
};


