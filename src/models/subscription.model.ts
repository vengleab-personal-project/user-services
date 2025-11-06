import { SubscriptionTier, BillingCycle, SubscriptionLimits, BillingInfo, PlanType, QuotaLimits, QuotaUsage } from '../types/subscription.types';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  planType: PlanType; // 'monthly' or 'one_off'
  billingCycle?: BillingCycle;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'quota_exhausted';
  limits: SubscriptionLimits;
  quotaLimits?: QuotaLimits; // For one-off purchases
  quotaUsage?: QuotaUsage; // Current quota consumption
  billingInfo?: BillingInfo;
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}


