import { SubscriptionRepository } from '../repositories/subscription.repository';
import { UserRepository } from '../repositories/user.repository';
import { UsageRepository } from '../repositories/usage.repository';
import { Subscription } from '../models/subscription.model';
import { SubscriptionTier, UsageBasedCharge } from '../types/subscription.types';
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
  async upgradeTier(userId: string, newTier: SubscriptionTier, billingCycle?: 'monthly' | 'yearly'): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update user's subscription tier
    const updatedSubscription = await this.subscriptionRepository.update(subscription.id, {
      tier: newTier,
      billingCycle,
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
  getSubscriptionPrice(tier: SubscriptionTier, billingCycle: 'monthly' | 'yearly' = 'monthly'): number {
    const monthlyPrices = {
      free: 0,
      pro: 2900,
      enterprise: 19900,
    };

    const yearlyMultiplier = 10; // 2 months free on yearly

    const monthlyPrice = monthlyPrices[tier];
    
    if (billingCycle === 'yearly') {
      return monthlyPrice * yearlyMultiplier;
    }

    return monthlyPrice;
  }
}


