import { UsageBasedCharge } from '../types/subscription.types';

export interface UsageRecord {
  id: string;
  userId: string;
  month: string; // Format: YYYY-MM
  formsCreated: number;
  fieldsGenerated: number;
  apiCallsMade: number;
  aiQuestionsGenerated: number; // Track AI question generation
  charges: UsageBasedCharge[];
  totalCharges: number; // in cents
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  userId: string;
  // Expanded to support broader usage tracking categories, including GenAI
  eventType:
    | 'api_call'
    | 'form_created'
    | 'field_generated'
    | 'form_deleted'
    | 'ai_questions_generated'
    | 'custom';
  // Optional category to group usage across systems (api, ai, forms, auth, etc.)
  category?: 'api' | 'ai' | 'forms' | 'fields' | 'auth' | 'other';
  // Optional units to measure the quantity (e.g., requests, tokens, fields)
  units?: 'requests' | 'tokens' | 'fields' | 'items' | 'operations';
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}


