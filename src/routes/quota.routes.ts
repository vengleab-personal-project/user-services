import { Router } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { QuotaLimits } from '../types/subscription.types';

export const quotaRouter = Router();
const subscriptionService = new SubscriptionService();

/**
 * Admin: Reset user's quota usage
 * POST /api/quota/admin/reset/:userId
 */
quotaRouter.post('/admin/reset/:userId', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { userId } = req.params;
    
    const subscription = await subscriptionService.resetQuotaUsage(userId);
    
    res.json({
      success: true,
      message: 'Quota usage reset successfully',
      subscription,
    });
  } catch (error) {
    console.error('Reset quota error:', error);
    res.status(500).json({
      error: 'Failed to reset quota',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Admin: Adjust user's quota limits
 * POST /api/quota/admin/adjust/:userId
 */
quotaRouter.post('/admin/adjust/:userId', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { userId } = req.params;
    const adjustments: Partial<QuotaLimits> = req.body;
    
    if (!adjustments || Object.keys(adjustments).length === 0) {
      res.status(400).json({ error: 'No adjustments provided' });
      return;
    }
    
    const subscription = await subscriptionService.adjustQuotaLimits(userId, adjustments);
    
    res.json({
      success: true,
      message: 'Quota limits adjusted successfully',
      subscription,
    });
  } catch (error) {
    console.error('Adjust quota error:', error);
    res.status(500).json({
      error: 'Failed to adjust quota',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Admin: Grant quota package to user
 * POST /api/quota/admin/grant/:userId
 */
quotaRouter.post('/admin/grant/:userId', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { userId } = req.params;
    const quotaLimits: QuotaLimits = req.body;
    
    if (!quotaLimits) {
      res.status(400).json({ error: 'Quota limits not provided' });
      return;
    }
    
    const subscription = await subscriptionService.purchaseQuotaPackage(userId, quotaLimits);
    
    res.json({
      success: true,
      message: 'Quota package granted successfully',
      subscription,
    });
  } catch (error) {
    console.error('Grant quota error:', error);
    res.status(500).json({
      error: 'Failed to grant quota',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Check and deduct quota (for inter-service communication)
 * POST /api/quota/check
 */
quotaRouter.post('/check', async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const { resourceType, amount = 1 } = req.body;
    
    if (!resourceType) {
      res.status(400).json({ error: 'Resource type not provided' });
      return;
    }
    
    // Check quota
    const quotaCheck = await subscriptionService.checkQuota(
      req.user.id,
      resourceType,
      amount
    );
    console.log({quotaCheck});
    
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
    
    // Deduct quota for one-off plans
    if (quotaCheck.planType === 'one_off') {
      await subscriptionService.deductQuota(req.user.id, resourceType, amount);
    }
    
    res.json({
      allowed: true,
      remaining: quotaCheck.remaining,
      isUnlimited: quotaCheck.isUnlimited,
      planType: quotaCheck.planType,
    });
  } catch (error) {
    console.error('Check quota error:', error);
    res.status(500).json({
      error: 'Failed to check quota',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * User: Get current quota status
 * GET /api/quota/status
 */
quotaRouter.get('/status', async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    
    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    
    // Get quota status for all resource types
    const quotaStatus = {
      planType: subscription.planType,
      tier: subscription.tier,
      status: subscription.status,
      quotaLimits: subscription.quotaLimits,
      quotaUsage: subscription.quotaUsage,
      resources: {} as Record<string, any>,
    };
    
    // Check quota for each resource type
    const resourceTypes: Array<keyof QuotaLimits> = [
      'aiQuestionsGenerated',
      'apiCalls',
      'forms',
      'fields',
    ];
    
    for (const resourceType of resourceTypes) {
      try {
        const check = await subscriptionService.checkQuota(req.user.id, resourceType, 1);
        quotaStatus.resources[resourceType] = {
          remaining: check.remaining,
          isUnlimited: check.isUnlimited,
          allowed: check.allowed,
        };
      } catch (error) {
        quotaStatus.resources[resourceType] = {
          error: 'Failed to check quota',
        };
      }
    }
    
    res.json(quotaStatus);
  } catch (error) {
    console.error('Get quota status error:', error);
    res.status(500).json({
      error: 'Failed to get quota status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * User: Purchase quota package
 * POST /api/quota/purchase
 */
quotaRouter.post('/purchase', async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const quotaLimits: QuotaLimits = req.body;
    
    if (!quotaLimits) {
      res.status(400).json({ error: 'Quota limits not provided' });
      return;
    }
    
    // TODO: Add payment processing here
    // For now, just grant the quota
    
    const subscription = await subscriptionService.purchaseQuotaPackage(
      req.user.id,
      quotaLimits
    );
    
    res.json({
      success: true,
      message: 'Quota package purchased successfully',
      subscription,
    });
  } catch (error) {
    console.error('Purchase quota error:', error);
    res.status(500).json({
      error: 'Failed to purchase quota',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
