import { SubscriptionTier, BillingCycle, SubscriptionLimits, BillingInfo } from '../types/subscription.types';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingCycle?: BillingCycle;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  limits: SubscriptionLimits;
  billingInfo?: BillingInfo;
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}


