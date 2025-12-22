import { SessionRepository } from '../repositories/session.repository';
import { Session, CreateSessionInput } from '../models/session.model';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import UAParser from 'ua-parser-js';

export class SessionService {
  private sessionRepository: SessionRepository;

  constructor() {
    this.sessionRepository = new SessionRepository();
  }

  /**
   * Create a hash of the token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse user agent string
   */
  private parseUserAgent(userAgent?: string): { device?: string; browser?: string; os?: string } {
    if (!userAgent) {
      return {};
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      device: result.device.type || 'desktop',
      browser: result.browser.name ? `${result.browser.name} ${result.browser.version}` : undefined,
      os: result.os.name ? `${result.os.name} ${result.os.version}` : undefined,
    };
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      location?: string;
    }
  ): Promise<Session> {
    const tokenHash = this.hashToken(accessToken);
    const refreshTokenHash = this.hashToken(refreshToken);
    const { device, browser, os } = this.parseUserAgent(metadata?.userAgent);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(expiresIn));

    const input: CreateSessionInput = {
      userId,
      tokenHash,
      refreshTokenHash,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      device,
      browser,
      os,
      location: metadata?.location,
      expiresAt: expiresAt, // Can be Date or ISO string
    };

    return await this.sessionRepository.create(input);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return await this.sessionRepository.findByUserId(userId);
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    return await this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    await this.sessionRepository.updateActivity(sessionId, userId);
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.sessionRepository.deactivate(sessionId, userId);
  }

  /**
   * Revoke all sessions for a user (except current)
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.getActiveSessions(userId);

    const sessionsToRevoke = exceptSessionId
      ? sessions.filter((s) => s.id !== exceptSessionId)
      : sessions;

    await Promise.all(
      sessionsToRevoke.map((session) => this.revokeSession(session.id, userId))
    );

    logger.info('All sessions revoked for user', { userId, count: sessionsToRevoke.length });
  }

  /**
   * Validate session by token hash
   */
  async validateSession(token: string): Promise<Session | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    // Check if session is expired (session.expiresAt is a Date object from Prisma)
    if (session.expiresAt <= new Date()) {
      await this.revokeSession(session.id, session.userId);
      return null;
    }

    return session;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await this.sessionRepository.cleanupExpired();
  }
}

