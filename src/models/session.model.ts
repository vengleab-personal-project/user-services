export interface Session {
  id: string;
  userId: string;
  tokenHash: string; // JWT token hash for security
  refreshTokenHash?: string; // Refresh token hash
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

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
  expiresAt: string;
}

