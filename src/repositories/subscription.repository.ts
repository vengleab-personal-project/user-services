import { Subscription } from '../models/subscription.model';
import { DynamoDBUtils } from '../utils/dynamodb.utils';
import { TableNames } from '../config/dynamodb.config';
import { SubscriptionTier, SubscriptionLimits, PlanType } from '../types/subscription.types';
import { config } from '../config';

export class SubscriptionRepository {
  /**
   * Get subscription limits by tier
   */
  private getLimitsByTier(tier: SubscriptionTier): SubscriptionLimits {
    return config.subscriptionLimits[tier];
  }

  /**
   * Create a new subscription
   */
  async create(subscriptionData: Partial<Subscription>): Promise<Subscription> {
    const tier = subscriptionData.tier || SubscriptionTier.FREE;
    const subscription: Subscription = {
      id: DynamoDBUtils.generateId('sub'),
      userId: subscriptionData.userId || '',
      tier,
      planType: subscriptionData.planType || PlanType.MONTHLY,
      billingCycle: subscriptionData.billingCycle,
      status: subscriptionData.status || 'active',
      limits: this.getLimitsByTier(tier),
      billingInfo: subscriptionData.billingInfo,
      startDate: subscriptionData.startDate || DynamoDBUtils.getTimestamp(),
      endDate: subscriptionData.endDate,
      trialEndDate: subscriptionData.trialEndDate,
      createdAt: DynamoDBUtils.getTimestamp(),
      updatedAt: DynamoDBUtils.getTimestamp(),
      metadata: subscriptionData.metadata || {},
    };

    await DynamoDBUtils.put(TableNames.Subscriptions, subscription);
    return subscription;
  }

  /**
   * Find subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    const subscriptions = await DynamoDBUtils.query<Subscription>(
      TableNames.Subscriptions,
      '#userId = :userId',
      { '#userId': 'userId' },
      { ':userId': userId },
      'UserIdIndex',
      1
    );
    return subscriptions.length > 0 ? subscriptions[0] : null;
  }

  /**
   * Find subscription by ID
   */
  async findById(subscriptionId: string): Promise<Subscription | null> {
    return await DynamoDBUtils.get<Subscription>(TableNames.Subscriptions, { id: subscriptionId });
  }

  /**
   * Update subscription
   */
  async update(subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription> {
    // If tier is being updated, update limits as well
    if (updates.tier) {
      updates.limits = this.getLimitsByTier(updates.tier);
    }

    const updatedSubscription = await DynamoDBUtils.update(
      TableNames.Subscriptions,
      { id: subscriptionId },
      { ...updates, updatedAt: DynamoDBUtils.getTimestamp() }
    );
    return updatedSubscription as Subscription;
  }

  /**
   * Cancel subscription
   */
  async cancel(subscriptionId: string): Promise<Subscription> {
    return await this.update(subscriptionId, {
      status: 'cancelled',
      cancelledAt: DynamoDBUtils.getTimestamp(),
    });
  }

  /**
   * Upgrade subscription tier
   */
  async upgradeTier(subscriptionId: string, newTier: SubscriptionTier): Promise<Subscription> {
    return await this.update(subscriptionId, { tier: newTier });
  }

  /**
   * Delete subscription
   */
  async delete(subscriptionId: string): Promise<void> {
    await DynamoDBUtils.delete(TableNames.Subscriptions, { id: subscriptionId });
  }
}


