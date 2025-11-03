import { UsageBasedCharge } from '../types/subscription.types';

export interface UsageRecord {
  id: string;
  userId: string;
  month: string; // Format: YYYY-MM
  formsCreated: number;
  fieldsGenerated: number;
  apiCallsMade: number;
  charges: UsageBasedCharge[];
  totalCharges: number; // in cents
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  userId: string;
  eventType: 'api_call' | 'form_created' | 'field_generated' | 'form_deleted';
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}


