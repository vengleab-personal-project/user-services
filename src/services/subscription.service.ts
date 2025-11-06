import { SubscriptionRepository } from '../repositories/subscription.repository';
import { UserRepository } from '../repositories/user.repository';
import { UsageRepository } from '../repositories/usage.repository';
import { Subscription } from '../models/subscription.model';
import { SubscriptionTier, BillingCycle, UsageBasedCharge, PlanType, QuotaLimits, QuotaUsage } from '../types/subscription.types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DynamoDBUtils } from '../utils/dynamodb.utils';

export class SubscriptionService {
  private subscriptionRepository: SubscriptionRepository;
  private userRepository: UserRepository;
  private usageRepository: UsageRepository;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
    this.userRepository = new UserRepository();
    this.usageRepository = new UsageRepository();
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findByUserId(userId);
  }

  /**
   * Upgrade user subscription
   */
  async upgradeTier(userId: string, newTier: SubscriptionTier, billingCycle?: BillingCycle): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update user's subscription tier
    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      tier: newTier,
      billingCycle: billingCycle as BillingCycle | undefined,
    });

    // Update user's tier in user table
    await this.userRepository.update(userId, {
      subscriptionTier: newTier,
    });

    logger.info('Subscription upgraded', { userId, oldTier: subscription.tier, newTier });

    return updatedSubscription;
  }

  /**
   * Downgrade user subscription
   */
  async downgradeTier(userId: string, newTier: SubscriptionTier): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription
    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      tier: newTier,
    });

    // Update user tier
    await this.userRepository.update(userId, {
      subscriptionTier: newTier,
    });

    logger.info('Subscription downgraded', { userId, oldTier: subscription.tier, newTier });

    return updatedSubscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const cancelledSubscription = await this.subscriptionRepository.cancel(subscription.id);

    logger.info('Subscription cancelled', { userId, subscriptionId: subscription.id });

    return cancelledSubscription;
  }

  /**
   * Check if user has exceeded subscription limits
   */
  async checkLimits(userId: string): Promise<{
    formsAllowed: boolean;
    fieldsAllowed: boolean;
    apiCallsAllowed: boolean;
    limits: any;
    usage: any;
  }> {
    const subscription = await this.getUserSubscription(userId);
    let userStats = await this.userRepository.getStats(userId);
    const currentUsage = await this.usageRepository.getOrCreateCurrentMonthUsage(userId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Auto-create user stats if missing (for users created during errors)
    if (!userStats) {
      userStats = {
        userId,
        formCount: 0,
        fieldCount: 0,
        apiCallsThisMonth: 0,
        totalApiCalls: 0,
        storageUsed: 0,
        lastUpdated: new Date().toISOString(),
      };
      // Save to database
      await this.userRepository.updateStats(userId, userStats);
    }

    const limits = subscription.limits;

    return {
      formsAllowed: userStats.formCount < limits.forms,
      fieldsAllowed: userStats.fieldCount < limits.fields,
      apiCallsAllowed: currentUsage.apiCallsMade < limits.apiCalls,
      limits,
      usage: {
        forms: userStats.formCount,
        fields: userStats.fieldCount,
        apiCalls: currentUsage.apiCallsMade,
      },
    };
  }

  /**
   * Calculate usage-based charges for overage
   */
  async calculateOverageCharges(userId: string): Promise<UsageBasedCharge[]> {
    const subscription = await this.getUserSubscription(userId);
    const currentUsage = await this.usageRepository.getOrCreateCurrentMonthUsage(userId);
    const userStats = await this.userRepository.getStats(userId);

    if (!subscription || !userStats) {
      return [];
    }

    const charges: UsageBasedCharge[] = [];
    const limits = subscription.limits;

    // Calculate API calls overage
    if (currentUsage.apiCallsMade > limits.apiCalls) {
      const overage = currentUsage.apiCallsMade - limits.apiCalls;
      const billableUnits = Math.ceil(overage / 100); // Per 100 API calls
      const charge: UsageBasedCharge = {
        id: DynamoDBUtils.generateId('charge'),
        type: 'api_calls',
        quantity: overage,
        unitPrice: config.pricing.per100ApiCalls,
        totalAmount: billableUnits * config.pricing.per100ApiCalls,
        description: `${overage} extra API calls`,
        createdAt: DynamoDBUtils.getTimestamp(),
      };
      charges.push(charge);
    }

    // Calculate forms overage
    if (userStats.formCount > limits.forms) {
      const overage = userStats.formCount - limits.forms;
      const billableUnits = Math.ceil(overage / 10); // Per 10 forms
      const charge: UsageBasedCharge = {
        id: DynamoDBUtils.generateId('charge'),
        type: 'forms',
        quantity: overage,
        unitPrice: config.pricing.per10Forms,
        totalAmount: billableUnits * config.pricing.per10Forms,
        description: `${overage} extra forms`,
        createdAt: DynamoDBUtils.getTimestamp(),
      };
      charges.push(charge);
    }

    return charges;
  }

  /**
   * Process monthly billing
   */
  async processMonthlyBilling(userId: string): Promise<{
    baseCharge: number;
    overageCharges: UsageBasedCharge[];
    totalCharge: number;
  }> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Base subscription charge (in cents)
    const baseCharges = {
      free: 0,
      pro: 2900, // $29.00
      enterprise: 19900, // $199.00
    };

    const baseCharge = baseCharges[subscription.tier];

    // Calculate overage charges
    const overageCharges = await this.calculateOverageCharges(userId);
    const overageTotal = overageCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);

    const totalCharge = baseCharge + overageTotal;

    // Store charges in usage record
    for (const charge of overageCharges) {
      await this.usageRepository.addCharge(userId, charge);
    }

    logger.info('Monthly billing processed', { userId, baseCharge, overageTotal, totalCharge });

    return {
      baseCharge,
      overageCharges,
      totalCharge,
    };
  }

  /**
   * Get subscription price
   */
  getSubscriptionPrice(tier: SubscriptionTier, billingCycle: BillingCycle = BillingCycle.MONTHLY): number {
    const monthlyPrices: Record<SubscriptionTier, number> = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PRO]: 2900,
      [SubscriptionTier.ENTERPRISE]: 19900,
    };

    const yearlyMultiplier = 10; // 2 months free on yearly

    const monthlyPrice = monthlyPrices[tier];
    
    if (billingCycle === BillingCycle.YEARLY) {
      return monthlyPrice * yearlyMultiplier;
    }

    return monthlyPrice;
  }

  /**
   * Check if user has available quota for a specific resource
   */
  async checkQuota(userId: string, resourceType: keyof QuotaUsage, amount: number = 1): Promise<{
    allowed: boolean;
    remaining: number;
    isUnlimited: boolean;
    planType: PlanType;
  }> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Monthly plans with unlimited quota (enterprise tier)
    console.log({subscription});
    
    if (subscription.planType === PlanType.MONTHLY && subscription.tier === 'enterprise') {
      return {
        allowed: true,
        remaining: Infinity,
        isUnlimited: true,
        planType: subscription.planType,
      };
    }

    // For monthly plans, check against monthly limits
    if (subscription.planType === PlanType.MONTHLY) {
      const currentUsage = await this.usageRepository.getOrCreateCurrentMonthUsage(userId);
      let limit = 0;
      let used = 0;

      // Map quota resource types to usage record fields
      if (resourceType === 'aiQuestionsGenerated') {
        limit = subscription.limits.apiCalls || 0;
        used = currentUsage.aiQuestionsGenerated || 0;
      } else if (resourceType === 'apiCalls') {
        limit = subscription.limits.apiCalls || 0;
        used = currentUsage.apiCallsMade || 0;
      } else if (resourceType === 'forms') {
        limit = subscription.limits.forms || 0;
        used = currentUsage.formsCreated || 0;
      } else if (resourceType === 'fields') {
        limit = subscription.limits.fields || 0;
        used = currentUsage.fieldsGenerated || 0;
      }

      const remaining = Math.max(0, limit - used);

      return {
        allowed: remaining >= amount,
        remaining,
        isUnlimited: false,
        planType: subscription.planType,
      };
    }

    // For one-off plans, check against quota limits
    if (subscription.planType === PlanType.ONE_OFF) {
      if (!subscription.quotaLimits || !subscription.quotaUsage) {
        throw new Error('Quota limits not configured for one-off plan');
      }

      const limit = (subscription.quotaLimits[resourceType] as number) || 0;
      const used = (subscription.quotaUsage[resourceType] as number) || 0;
      const remaining = Math.max(0, limit - used);

      return {
        allowed: remaining >= amount,
        remaining,
        isUnlimited: false,
        planType: subscription.planType,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      isUnlimited: false,
      planType: subscription.planType,
    };
  }

  /**
   * Deduct quota for a resource (for one-off plans)
   */
  async deductQuota(userId: string, resourceType: keyof QuotaUsage, amount: number = 1): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Only deduct for one-off plans
    if (subscription.planType === PlanType.ONE_OFF) {
      if (!subscription.quotaUsage) {
        subscription.quotaUsage = {
          aiQuestionsGenerated: 0,
          apiCalls: 0,
          forms: 0,
          fields: 0,
          lastUpdated: DynamoDBUtils.getTimestamp(),
        };
      }

      const currentUsage = (subscription.quotaUsage[resourceType] as number) || 0;
      const newUsage = currentUsage + amount;
      
      (subscription.quotaUsage[resourceType] as number) = newUsage;
      subscription.quotaUsage.lastUpdated = DynamoDBUtils.getTimestamp();

      // Check if quota is exhausted
      const quotaLimits = subscription.quotaLimits!;
      const allExhausted = Object.keys(quotaLimits).every((key) => {
        const k = key as keyof QuotaLimits;
        const usageValue = subscription.quotaUsage![k as keyof QuotaUsage];
        const limitValue = quotaLimits[k];
        // Skip non-numeric fields
        if (typeof usageValue !== 'number' || typeof limitValue !== 'number') {
          return true;
        }
        return usageValue >= limitValue;
      });

      if (allExhausted) {
        subscription.status = 'quota_exhausted';
      }

      await this.subscriptionRepository.update(subscription.id, {
        quotaUsage: subscription.quotaUsage,
        status: subscription.status,
      });

      logger.info('Quota deducted', { userId, resourceType, amount, newUsage });
    }
    // For monthly plans, usage is tracked separately in UsageRecord
  }

  /**
   * Purchase one-off quota package
   */
  async purchaseQuotaPackage(userId: string, quotaLimits: QuotaLimits): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Initialize or add to existing quota
    const currentQuotaLimits = subscription.quotaLimits || {
      aiQuestionsGenerated: 0,
      apiCalls: 0,
      forms: 0,
      fields: 0,
    };

    const newQuotaLimits: QuotaLimits = {
      aiQuestionsGenerated: currentQuotaLimits.aiQuestionsGenerated + quotaLimits.aiQuestionsGenerated,
      apiCalls: currentQuotaLimits.apiCalls + quotaLimits.apiCalls,
      forms: currentQuotaLimits.forms + quotaLimits.forms,
      fields: currentQuotaLimits.fields + quotaLimits.fields,
      dataSize: (currentQuotaLimits.dataSize || 0) + (quotaLimits.dataSize || 0),
    };

    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      planType: PlanType.ONE_OFF,
      quotaLimits: newQuotaLimits,
      status: 'active',
    });

    logger.info('Quota package purchased', { userId, quotaLimits });

    return updatedSubscription;
  }

  /**
   * Reset quota usage (admin function)
   */
  async resetQuotaUsage(userId: string): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const resetQuotaUsage: QuotaUsage = {
      aiQuestionsGenerated: 0,
      apiCalls: 0,
      forms: 0,
      fields: 0,
      lastUpdated: DynamoDBUtils.getTimestamp(),
    };

    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      quotaUsage: resetQuotaUsage,
      status: 'active',
    });

    logger.info('Quota usage reset', { userId });

    return updatedSubscription;
  }

  /**
   * Manually adjust quota limits (admin function)
   */
  async adjustQuotaLimits(userId: string, adjustments: Partial<QuotaLimits>): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const currentQuotaLimits = subscription.quotaLimits || {
      aiQuestionsGenerated: 0,
      apiCalls: 0,
      forms: 0,
      fields: 0,
    };

    const newQuotaLimits: QuotaLimits = {
      ...currentQuotaLimits,
      ...adjustments,
    };

    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      quotaLimits: newQuotaLimits,
    });

    logger.info('Quota limits adjusted', { userId, adjustments });

    return updatedSubscription;
  }
}


