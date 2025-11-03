import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { authenticate, requireTier } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, updateSubscriptionSchema } from '../utils/validation.utils';
import { SubscriptionTier } from '../types/subscription.types';

const router = Router();
const subscriptionService = new SubscriptionService();
const subscriptionRepository = new SubscriptionRepository();

/**
 * Get current user's subscription (with auto-creation if missing)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    let subscription = await subscriptionService.getUserSubscription(req.user!.id);
    
    // Auto-create subscription if missing (for users created during errors)
    if (!subscription) {
      subscription = await subscriptionRepository.create({
        userId: req.user!.id,
        tier: 'free',
        status: 'active',
      });
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
    // Ensure subscription exists
    let subscription = await subscriptionService.getUserSubscription(req.user!.id);
    if (!subscription) {
      subscription = await subscriptionRepository.create({
        userId: req.user!.id,
        tier: 'free',
        status: 'active',
      });
    }
    
    const limits = await subscriptionService.checkLimits(req.user!.id);
    res.json(limits);
  })
);

/**
 * Get subscription pricing
 */
router.get(
  '/pricing',
  asyncHandler(async (req: Request, res: Response) => {
    const pricing = {
      free: {
        monthly: subscriptionService.getSubscriptionPrice('free', 'monthly'),
        yearly: subscriptionService.getSubscriptionPrice('free', 'yearly'),
        limits: {
          forms: 10,
          fields: 100,
          apiCalls: 1000,
        },
      },
      pro: {
        monthly: subscriptionService.getSubscriptionPrice('pro', 'monthly'),
        yearly: subscriptionService.getSubscriptionPrice('pro', 'yearly'),
        limits: {
          forms: 100,
          fields: 999999,
          apiCalls: 50000,
        },
      },
      enterprise: {
        monthly: subscriptionService.getSubscriptionPrice('enterprise', 'monthly'),
        yearly: subscriptionService.getSubscriptionPrice('enterprise', 'yearly'),
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
    const { tier, billingCycle } = validateBody(updateSubscriptionSchema, req.body);

    const subscription = await subscriptionService.upgradeTier(req.user!.id, tier as SubscriptionTier, billingCycle);

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
    const { tier } = validateBody(updateSubscriptionSchema, req.body);

    const subscription = await subscriptionService.downgradeTier(req.user!.id, tier as SubscriptionTier);

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
    const subscription = await subscriptionService.cancelSubscription(req.user!.id);

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
    const charges = await subscriptionService.calculateOverageCharges(req.user!.id);
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
