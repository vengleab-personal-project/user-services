import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const uuid = uuidv4();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Get current timestamp as ISO string
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

