import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { UsageService } from '../services/usage.service';
import { QuotaUsage } from '../types/subscription.types';

const subscriptionService = new SubscriptionService();
const usageService = new UsageService();

/**
 * Check and deduct quota for a specific resource
 * This middleware checks if the user has available quota and deducts it in real-time
 */
export const checkAndDeductQuota = (
  resourceType: keyof QuotaUsage,
  amount: number = 1,
  trackUsage: boolean = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      // Check if user has available quota
      const quotaCheck = await subscriptionService.checkQuota(
        req.user.id,
        resourceType,
        amount
      );

      if (!quotaCheck.allowed) {
        res.status(429).json({
          error: 'Quota exceeded',
          message: `You have exhausted your ${resourceType} quota`,
          remaining: quotaCheck.remaining,
          planType: quotaCheck.planType,
          upgrade: quotaCheck.planType === 'one_off' 
            ? 'Purchase more quota to continue' 
            : 'Upgrade your plan for higher limits',
        });
        return;
      }

      // Deduct quota for one-off plans (monthly plans track usage separately)
      if (quotaCheck.planType === 'one_off') {
        await subscriptionService.deductQuota(req.user.id, resourceType, amount);
      }

      // Track usage for analytics (both monthly and one-off plans)
      if (trackUsage) {
        if (resourceType === 'aiQuestionsGenerated') {
          // Track after the request completes successfully
          res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              usageService.trackAIQuestionsGenerated(req.user!.id, amount, {
                endpoint: req.path,
                method: req.method,
              }).catch((error) => {
                console.error('Usage tracking error:', error);
              });
            }
          });
        }
      }

      // Attach quota info to request for downstream use
      (req as any).quotaInfo = {
        remaining: quotaCheck.remaining,
        isUnlimited: quotaCheck.isUnlimited,
        planType: quotaCheck.planType,
      };

      next();
    } catch (error) {
      console.error('Quota check error:', error);
      res.status(500).json({ 
        error: 'Failed to check quota',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Check quota without deducting (read-only check)
 */
export const checkQuotaOnly = (resourceType: keyof QuotaUsage) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const quotaCheck = await subscriptionService.checkQuota(
        req.user.id,
        resourceType,
        1
      );

      // Attach quota info to request
      (req as any).quotaInfo = {
        remaining: quotaCheck.remaining,
        isUnlimited: quotaCheck.isUnlimited,
        planType: quotaCheck.planType,
        allowed: quotaCheck.allowed,
      };

      next();
    } catch (error) {
      console.error('Quota check error:', error);
      res.status(500).json({ 
        error: 'Failed to check quota',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Middleware to enforce daily limit for specific endpoints
 * This is useful for free tier or additional rate limiting on top of quota
 */
export const dailyLimit = (maxPerDay: number, resourceKey: string) => {
  // In-memory store for daily limits (in production, use Redis)
  const dailyUsage = new Map<string, { count: number; date: string }>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `${req.user.id}:${resourceKey}:${today}`;
    
    const usage = dailyUsage.get(key);
    
    if (usage && usage.date === today) {
      if (usage.count >= maxPerDay) {
        res.status(429).json({
          error: 'Daily limit exceeded',
          message: `You have reached the daily limit of ${maxPerDay} for ${resourceKey}`,
          retryAfter: 'tomorrow',
        });
        return;
      }
      usage.count++;
    } else {
      dailyUsage.set(key, { count: 1, date: today });
    }

    // Clean up old entries (older than 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    
    for (const [k, v] of dailyUsage.entries()) {
      if (v.date < twoDaysAgoStr) {
        dailyUsage.delete(k);
      }
    }

    next();
  };
};
