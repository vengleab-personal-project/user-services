import { ABACPolicy } from '../types/abac.types';

export interface PolicyModel extends ABACPolicy {
  // Additional model-specific fields if needed
}

export interface PolicyAssignment {
  id: string;
  policyId: string;
  userId?: string;
  groupId?: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
}


