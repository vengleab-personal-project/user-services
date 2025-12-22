import { prisma } from '../config/prisma.config';
import { Session, CreateSessionInput } from '../models/session.model';
import { logger } from '../utils/logger';

export class SessionRepository {
  /**
   * Create a new session
   */
  async create(input: CreateSessionInput): Promise<Session> {
    try {
      const session = await prisma.session.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          refreshTokenHash: input.refreshTokenHash,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          device: input.device,
          browser: input.browser,
          os: input.os,
          location: input.location,
          expiresAt: new Date(input.expiresAt),
          isActive: true,
        },
      });

      logger.info('Session created', { sessionId: session.id, userId: session.userId });
      return session;
    } catch (error) {
      logger.error('Error creating session', { error, input });
      throw error;
    }
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: string, userId: string): Promise<Session | null> {
    try {
      return await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
      });
    } catch (error) {
      logger.error('Error finding session by ID', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Find session by token hash
   */
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    try {
      const session = await prisma.session.findUnique({
        where: {
          tokenHash: tokenHash,
        },
      });

      if (!session || !session.isActive) {
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Error finding session by token hash', { error });
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   */
  async findByUserId(userId: string): Promise<Session[]> {
    try {
      return await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error finding sessions by user ID', { error, userId });
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    return await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string, userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: {
          id: sessionId,
          userId: userId,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error updating session activity', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Deactivate session
   */
  async deactivate(sessionId: string, userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: {
          id: sessionId,
          userId: userId,
        },
        data: {
          isActive: false,
        },
      });

      logger.info('Session deactivated', { sessionId, userId });
    } catch (error) {
      logger.error('Error deactivating session', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Deactivate all sessions for a user
   */
  async deactivateAllByUserId(userId: string): Promise<void> {
    try {
      const result = await prisma.session.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      logger.info('All sessions deactivated for user', { userId, count: result.count });
    } catch (error) {
      logger.error('Error deactivating all sessions', { error, userId });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async delete(sessionId: string, userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId: userId,
        },
      });

      logger.info('Session deleted', { sessionId, userId });
    } catch (error) {
      logger.error('Error deleting session', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info('Expired sessions cleaned up', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error });
      throw error;
    }
  }
}
