import { z } from 'zod';
import { FieldType } from '../models/form.model';

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  oauthProvider: z.enum(['google', 'github']),
  oauthId: z.string(),
  avatar: z.string().url().optional(),
});

// Form validation schemas
export const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).default('private'),
});

export const updateFormSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).optional(),
  pages: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })).optional(),
  fields: z.array(z.any()).optional(),
});

export const createFieldSchema = z.object({
  label: z.string().min(1).max(200),
  type: z.nativeEnum(FieldType),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  pageId: z.string(),
});

// Subscription validation schemas
export const updateSubscriptionSchema = z.object({
  tier: z.enum(['free', 'pro', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
});

// Policy validation schemas
export const createPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  resource: z.string().min(1),
  action: z.string().min(1),
  effect: z.enum(['allow', 'deny']),
  conditions: z.any().optional(),
  priority: z.number().int().min(0).max(1000),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

/**
 * Validate request body against a schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}


