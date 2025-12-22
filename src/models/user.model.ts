import { User as PrismaUser, UserStats as PrismaUserStats } from '@prisma/client';

// Re-export Prisma types for backward compatibility
export type User = PrismaUser;
export type UserStats = PrismaUserStats;

// Export the Prisma types as named exports
export { PrismaUser, PrismaUserStats };
