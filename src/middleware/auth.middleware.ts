import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { UserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

const userRepository = new UserRepository();

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Verify token
    const payload = JWTService.verifyToken(token);

    // Get user from database
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = JWTService.verifyToken(token);
      const user = await userRepository.findById(payload.userId);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

/**
 * Subscription tier authorization middleware
 * Note: Consider using ABAC policies instead for more flexible tier-based access control
 */
export const requireTier = (...tiers: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userTier = (req.user as any).subscriptionTier;

    if (!tiers.includes(userTier)) {
      res.status(403).json({ 
        error: 'Subscription tier not sufficient',
        requiredTier: tiers,
        currentTier: userTier,
      });
      return;
    }

    next();
  };
};


