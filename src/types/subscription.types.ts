export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum PlanType {
  MONTHLY = 'monthly',
  ONE_OFF = 'one_off',
}

export interface SubscriptionLimits {
  forms: number;
  fields: number;
  apiCalls: number;
  aiQuestionsGenerated?: number; // Optional for backward compatibility
}

// Quota-based limits for purchased plans
export interface QuotaLimits {
  aiQuestionsGenerated: number; // Quota for AI question generation
  apiCalls: number; // General API calls quota
  forms: number; // Forms creation quota
  fields: number; // Fields generation quota
  dataSize?: number; // Optional data size limit in bytes
}

export interface UsageMetrics {
  formsCreated: number;
  fieldsGenerated: number;
  apiCallsMade: number;
  lastResetDate: string;
}

// Quota usage tracking
export interface QuotaUsage {
  aiQuestionsGenerated: number;
  apiCalls: number;
  forms: number;
  fields: number;
  dataSize?: number;
  lastUpdated: string;
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


