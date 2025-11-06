import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { User } from '../models/user.model';

/**
 * Create rate limiter based on subscription tier
 */
export const createRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req: Request) => {
      // Get user's subscription tier from request
      const user = req.user as User | undefined;
      if (user && user.subscriptionTier) {
        switch (user.subscriptionTier) {
          case 'enterprise':
            return config.rateLimit.enterprise;
          case 'pro':
            return config.rateLimit.pro;
          case 'free':
          default:
            return config.rateLimit.free;
        }
      }
      // Default rate limit for unauthenticated requests
      return 30;
    },
    message: (req: Request) => {
      const user = req.user as User | undefined;
      const tier = user?.subscriptionTier || 'unauthenticated';
      return {
        error: 'Too many requests',
        message: `Rate limit exceeded for ${tier} tier`,
        retryAfter: 60,
      };
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    // Use user ID as key for authenticated requests
    keyGenerator: (req: Request) => {
      const user = req.user as User | undefined;
      return user?.id || req.ip || 'anonymous';
    },
    handler: (req: Request, res: Response) => {
      const user = req.user as User | undefined;
      const tier = user?.subscriptionTier || 'unauthenticated';
      const limit = user && user.subscriptionTier
        ? config.rateLimit[user.subscriptionTier as keyof typeof config.rateLimit]
        : 30;

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded for ${tier} tier`,
        limit,
        retryAfter: 60,
        upgrade: tier === 'free' ? 'Upgrade to Pro for higher rate limits' : undefined,
      });
    },
  });
};

/**
 * Strict rate limiter for sensitive endpoints (e.g., auth)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


