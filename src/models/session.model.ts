import { Session as PrismaSession } from '@prisma/client';

// Re-export Prisma type for backward compatibility
export type Session = PrismaSession;

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  refreshTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  expiresAt: string | Date;
}
