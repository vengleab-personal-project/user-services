import { Policy as PrismaPolicy } from '@prisma/client';

// Re-export Prisma type
export type PolicyModel = PrismaPolicy;

export interface PolicyAssignment {
  id: string;
  policyId: string;
  userId?: string;
  groupId?: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
}
