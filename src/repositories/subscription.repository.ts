import { Subscription } from '../models/subscription.model';
import { prisma } from '../config/prisma.config';
import { SubscriptionTier, SubscriptionLimits, PlanType } from '../types/subscription.types';
import { config } from '../config';
import { Prisma } from '@prisma/client';

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
  async create(subscriptionData: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Subscription> {
    const tier = subscriptionData.tier || SubscriptionTier.FREE;
    return await prisma.subscription.create({
      data: {
        userId: subscriptionData.userId || '',
        tier,
        planType: subscriptionData.planType || PlanType.MONTHLY,
        billingCycle: subscriptionData.billingCycle as any,
        status: subscriptionData.status || 'active',
        limits: this.getLimitsByTier(tier) as Prisma.InputJsonValue,
        quotaLimits: subscriptionData.quotaLimits as Prisma.InputJsonValue,
        quotaUsage: subscriptionData.quotaUsage as Prisma.InputJsonValue,
        billingInfo: subscriptionData.billingInfo as Prisma.InputJsonValue,
        startDate: subscriptionData.startDate ? new Date(subscriptionData.startDate) : new Date(),
        endDate: subscriptionData.endDate ? new Date(subscriptionData.endDate) : null,
        trialEndDate: subscriptionData.trialEndDate ? new Date(subscriptionData.trialEndDate) : null,
        metadata: subscriptionData.metadata as Prisma.InputJsonValue || {},
      },
    });
  }

  /**
   * Find subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    return await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find subscription by ID
   */
  async findById(subscriptionId: string): Promise<Subscription | null> {
    return await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
  }

  /**
   * Update subscription
   */
  async update(subscriptionId: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Subscription> {
    // If tier is being updated, update limits as well
    let limitsToUpdate = updates.limits;
    if (updates.tier) {
      limitsToUpdate = this.getLimitsByTier(updates.tier);
    }

    return await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(updates.tier && { tier: updates.tier }),
        ...(updates.planType && { planType: updates.planType }),
        ...(updates.billingCycle && { billingCycle: updates.billingCycle as any }),
        ...(updates.status && { status: updates.status }),
        ...(limitsToUpdate && { limits: limitsToUpdate as Prisma.InputJsonValue }),
        ...(updates.quotaLimits !== undefined && { quotaLimits: updates.quotaLimits as Prisma.InputJsonValue }),
        ...(updates.quotaUsage !== undefined && { quotaUsage: updates.quotaUsage as Prisma.InputJsonValue }),
        ...(updates.billingInfo !== undefined && { billingInfo: updates.billingInfo as Prisma.InputJsonValue }),
        ...(updates.startDate && { startDate: new Date(updates.startDate) }),
        ...(updates.endDate !== undefined && { endDate: updates.endDate ? new Date(updates.endDate) : null }),
        ...(updates.trialEndDate !== undefined && { trialEndDate: updates.trialEndDate ? new Date(updates.trialEndDate) : null }),
        ...(updates.cancelledAt !== undefined && { cancelledAt: updates.cancelledAt ? new Date(updates.cancelledAt) : null }),
        ...(updates.metadata && { metadata: updates.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  /**
   * Cancel subscription
   */
  async cancel(subscriptionId: string): Promise<Subscription> {
    return await this.update(subscriptionId, {
      status: 'cancelled',
      cancelledAt: new Date(),
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
    await prisma.subscription.delete({
      where: { id: subscriptionId },
    });
  }
}
