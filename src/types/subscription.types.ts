export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface SubscriptionLimits {
  forms: number;
  fields: number;
  apiCalls: number;
}

export interface UsageMetrics {
  formsCreated: number;
  fieldsGenerated: number;
  apiCallsMade: number;
  lastResetDate: string;
}

export interface BillingInfo {
  customerId?: string; // Stripe customer ID
  paymentMethodId?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  amountDue?: number; // in cents
}

export interface UsageBasedCharge {
  id: string;
  type: 'api_calls' | 'forms' | 'fields' | 'support';
  quantity: number;
  unitPrice: number; // in cents
  totalAmount: number; // in cents
  description: string;
  createdAt: string;
}


