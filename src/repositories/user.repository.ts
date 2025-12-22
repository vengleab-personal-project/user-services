import { User, UserStats } from '../models/user.model';
import { prisma } from '../config/prisma.config';
import { Prisma } from '@prisma/client';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: userData.email || '',
        name: userData.name || '',
        avatar: userData.avatar,
        role: userData.role || 'user',
        oauthProvider: userData.oauthProvider || 'google',
        oauthId: userData.oauthId || '',
        subscriptionTier: userData.subscriptionTier || 'free',
        lastLoginAt: new Date(),
        metadata: userData.metadata as Prisma.InputJsonValue || {},
        stats: {
          create: {
            formCount: 0,
            fieldCount: 0,
            apiCallsThisMonth: 0,
            totalApiCalls: 0,
            storageUsed: 0,
          }
        }
      },
      include: {
        stats: true
      }
    });

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    return await prisma.user.findMany();
  }

  /**
   * Find user by email (using unique index)
   */
  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by OAuth provider and ID (using unique constraint)
   */
  async findByOAuthProvider(provider: string, oauthId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider as any,
          oauthId: oauthId,
        }
      },
    });
  }

  /**
   * Update user
   */
  async update(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.email && { email: updates.email }),
        ...(updates.name && { name: updates.name }),
        ...(updates.avatar !== undefined && { avatar: updates.avatar }),
        ...(updates.role && { role: updates.role }),
        ...(updates.subscriptionTier && { subscriptionTier: updates.subscriptionTier }),
        ...(updates.lastLoginAt && { lastLoginAt: new Date(updates.lastLoginAt) }),
        ...(updates.metadata && { metadata: updates.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<User> {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Delete user
   */
  async delete(userId: string): Promise<void> {
    // Cascade delete is handled by Prisma schema
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<UserStats | null> {
    return await prisma.userStats.findUnique({
      where: { userId },
    });
  }

  /**
   * Update user statistics
   */
  async updateStats(userId: string, updates: Partial<Omit<UserStats, 'id' | 'userId' | 'lastUpdated'>>): Promise<UserStats> {
    return await prisma.userStats.update({
      where: { userId },
      data: {
        ...(updates.formCount !== undefined && { formCount: updates.formCount }),
        ...(updates.fieldCount !== undefined && { fieldCount: updates.fieldCount }),
        ...(updates.apiCallsThisMonth !== undefined && { apiCallsThisMonth: updates.apiCallsThisMonth }),
        ...(updates.totalApiCalls !== undefined && { totalApiCalls: updates.totalApiCalls }),
        ...(updates.storageUsed !== undefined && { storageUsed: BigInt(updates.storageUsed) }),
      },
    });
  }

  /**
   * Increment user statistics
   */
  async incrementStats(userId: string, field: keyof Pick<UserStats, 'formCount' | 'fieldCount' | 'apiCallsThisMonth' | 'totalApiCalls'>, amount: number = 1): Promise<void> {
    await prisma.userStats.update({
      where: { userId },
      data: {
        [field]: {
          increment: amount,
        },
      },
    });
  }
}
