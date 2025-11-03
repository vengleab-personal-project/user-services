import { Request, Response, NextFunction } from 'express';
import { UsageService } from '../services/usage.service';

const usageService = new UsageService();

/**
 * Usage tracking middleware
 * Tracks API calls for billing purposes
 */
export const trackUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user) {
    // Track in background (non-blocking)
    usageService.trackApiCall(req.user.id, req.path, {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
    }).catch((error) => {
      // Log error but don't fail the request
      console.error('Usage tracking error:', error);
    });
  }

  next();
};

/**
 * Check subscription limits before allowing action
 */
export const checkLimits = (limitType: 'forms' | 'fields' | 'apiCalls') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const { SubscriptionService } = await import('../services/subscription.service');
      const subscriptionService = new SubscriptionService();

      const limits = await subscriptionService.checkLimits(req.user.id);

      let allowed = false;
      switch (limitType) {
        case 'forms':
          allowed = limits.formsAllowed;
          break;
        case 'fields':
          allowed = limits.fieldsAllowed;
          break;
        case 'apiCalls':
          allowed = limits.apiCallsAllowed;
          break;
      }

      if (!allowed) {
        res.status(429).json({
          error: 'Subscription limit exceeded',
          limitType,
          limits: limits.limits,
          usage: limits.usage,
          message: `You've reached your ${limitType} limit for your ${req.user.subscriptionTier} subscription`,
          upgrade: req.user.subscriptionTier === 'free' ? 'Upgrade to Pro for higher limits' : undefined,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Limit check error:', error);
      res.status(500).json({ error: 'Failed to check subscription limits' });
    }
  };
};


