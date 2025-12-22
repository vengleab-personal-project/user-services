import { UsageRecord as PrismaUsageRecord, UsageEvent as PrismaUsageEvent } from '@prisma/client';

// Re-export Prisma types
export type UsageRecord = PrismaUsageRecord;
export type UsageEvent = PrismaUsageEvent;
