export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'editor';
  oauthProvider: 'google' | 'github';
  oauthId: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  metadata?: Record<string, any>;
}

export interface UserStats {
  userId: string;
  formCount: number;
  fieldCount: number;
  apiCallsThisMonth: number;
  totalApiCalls: number;
  storageUsed: number; // in bytes
  lastUpdated: string;
}


