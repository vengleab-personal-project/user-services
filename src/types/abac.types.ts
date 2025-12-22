export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

export interface Condition {
  field: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'greater' | 'less' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface TimeCondition {
  before?: string; // ISO date string
  after?: string; // ISO date string
  hours?: {
    start: number; // 0-23
    end: number; // 0-23
  };
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
}

export interface GeoCondition {
  allowedCountries?: string[];
  deniedCountries?: string[];
}

export interface PolicyConditions {
  userAttribute?: Condition;
  resourceAttribute?: Condition;
  resourceOwnership?: Condition;
  time?: TimeCondition;
  geo?: GeoCondition;
  custom?: string; // JavaScript expression evaluated at runtime
}

export interface ABACPolicy {
  id: string;
  name: string;
  description?: string;
  resource: string; // e.g., 'form', 'form:field', 'user', '*'
  action: string; // e.g., 'read', 'write', 'delete', 'create', '*'
  effect: PolicyEffect;
  conditions?: PolicyConditions;
  priority: number; // Higher priority evaluated first
  userId?: string; // If set, policy only applies to this user
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ABACEvaluationContext {
  user: {
    id: string;
    role: string;
    subscriptionTier: string;
    email: string;
    stats?: {
      formCount: number;
      fieldCount: number;
      apiCallsThisMonth: number; // Fetched from UsageRecord, not UserStats
    };
    [key: string]: any;
  };
  resource: {
    type: string;
    id?: string;
    userId?: string;
    visibility?: string;
    isPremium?: boolean;
    [key: string]: any;
  };
  action: string;
  subscription?: {
    limits: {
      forms: number;
      fields: number;
      apiCalls: number;
    };
  };
  request?: {
    ip?: string;
    country?: string;
    timestamp: Date;
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  deniedBy?: string[]; // Policy IDs that denied access
  allowedBy?: string[]; // Policy IDs that allowed access
  filteredFields?: string[]; // For field-level filtering
}


