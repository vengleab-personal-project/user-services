import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from './config/oauth.config';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { createRateLimiter } from './middleware/rateLimit.middleware';
import { trackUsage } from './middleware/usageTracking.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import formRoutes from './routes/form.routes';
import subscriptionRoutes from './routes/subscription.routes';
import usageRoutes from './routes/usage.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  const allowedOrigins = [
    config.frontend.url,
    config.frontend.secondaryUrl,
    config.genaiServiceUrl,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Passport initialization
  app.use(passport.initialize());

  // Optional authentication (attach user if token present, but don't fail)
  // This must run BEFORE rate limiting so it can see the user tier
  app.use(async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const { JWTService } = await import('./services/jwt.service');
          const { UserRepository } = await import('./repositories/user.repository');
          const payload = JWTService.verifyToken(token);
          const userRepository = new UserRepository();
          const user = await userRepository.findById(payload.userId);
          if (user) {
            req.user = user;
          }
        }
      }
    } catch (error) {
      // Silent fail - continue without user
    }
    next();
  });

  // Rate limiting (disabled in development for easier testing)
  if (config.env === 'production') {
    const rateLimiter = createRateLimiter();
    app.use(rateLimiter);
  }

  // Usage tracking (tracks all authenticated requests)
  app.use(trackUsage);

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/forms', formRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/usage', usageRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};


