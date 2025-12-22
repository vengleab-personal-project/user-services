import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { authenticate, requireTier } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, updateSubscriptionSchema } from '../utils/validation.utils';
import { SubscriptionTier, BillingCycle } from '../types/subscription.types';
import { User } from '../models/user.model';

const router: Router = Router();
const subscriptionService = new SubscriptionService();

/**
 * Get current user's subscription (with auto-creation if missing)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const subscription = await subscriptionService.getUserSubscription(user.id);
    
    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found. Please contact support.' });
      return;
    }
    
    res.json({ subscription });
  })
);

/**
 * Check subscription limits (with auto-creation if missing)
 */
router.get(
  '/me/limits',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const limits = await subscriptionService.checkLimits(user.id);
    res.json(limits);
  })
);

/**
 * Get subscription pricing
 */
router.get(
  '/pricing',
  asyncHandler(async (_req: Request, res: Response) => {
    const pricing = {
      free: {
        monthly: subscriptionService.getSubscriptionPrice(SubscriptionTier.FREE, BillingCycle.MONTHLY),
        yearly: subscriptionService.getSubscriptionPrice(SubscriptionTier.FREE, BillingCycle.YEARLY),
        limits: {
          forms: 10,
          fields: 100,
          apiCalls: 1000,
        },
      },
      pro: {
        monthly: subscriptionService.getSubscriptionPrice(SubscriptionTier.PRO, BillingCycle.MONTHLY),
        yearly: subscriptionService.getSubscriptionPrice(SubscriptionTier.PRO, BillingCycle.YEARLY),
        limits: {
          forms: 100,
          fields: 999999,
          apiCalls: 50000,
        },
      },
      enterprise: {
        monthly: subscriptionService.getSubscriptionPrice(SubscriptionTier.ENTERPRISE, BillingCycle.MONTHLY),
        yearly: subscriptionService.getSubscriptionPrice(SubscriptionTier.ENTERPRISE, BillingCycle.YEARLY),
        limits: {
          forms: 999999,
          fields: 999999,
          apiCalls: 999999,
        },
      },
    };

    res.json({ pricing });
  })
);

/**
 * Upgrade subscription
 */
router.post(
  '/upgrade',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const { tier, billingCycle } = validateBody(updateSubscriptionSchema, req.body);

    const subscription = await subscriptionService.upgradeTier(
      user.id,
      tier as SubscriptionTier,
      billingCycle ? (billingCycle as BillingCycle) : undefined
    );

    res.json({
      message: 'Subscription upgraded successfully',
      subscription,
    });
  })
);

/**
 * Downgrade subscription
 */
router.post(
  '/downgrade',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const { tier } = validateBody(updateSubscriptionSchema, req.body);

    const subscription = await subscriptionService.downgradeTier(user.id, tier as SubscriptionTier);

    res.json({
      message: 'Subscription downgraded successfully',
      subscription,
    });
  })
);

/**
 * Cancel subscription
 */
router.post(
  '/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const subscription = await subscriptionService.cancelSubscription(user.id);

    res.json({
      message: 'Subscription cancelled successfully',
      subscription,
    });
  })
);

/**
 * Calculate overage charges
 */
router.get(
  '/me/overage',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const charges = await subscriptionService.calculateOverageCharges(user.id);
    const totalAmount = charges.reduce((sum, charge) => sum + charge.totalAmount, 0);

    res.json({
      charges,
      totalAmount,
      currency: 'USD',
    });
  })
);

/**
 * Process billing (admin only)
 */
router.post(
  '/billing/process',
  authenticate,
  requireTier('enterprise'),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }

    const billing = await subscriptionService.processMonthlyBilling(userId);

    res.json({
      message: 'Billing processed successfully',
      billing,
    });
  })
);

export default router;
