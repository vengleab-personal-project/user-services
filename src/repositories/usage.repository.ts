import { UsageRecord, UsageEvent } from '../models/usage.model';
import { prisma } from '../config/prisma.config';
import { Prisma } from '@prisma/client';

export class UsageRepository {
  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get or create usage record for current month
   */
  async getOrCreateCurrentMonthUsage(userId: string): Promise<UsageRecord> {
    const month = this.getCurrentMonth();
    
    let usage = await prisma.usageRecord.findUnique({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
    });
    
    if (!usage) {
      usage = await prisma.usageRecord.create({
        data: {
          userId,
          month,
          formsCreated: 0,
          fieldsGenerated: 0,
          apiCallsMade: 0,
          aiQuestionsGenerated: 0,
          charges: [] as Prisma.InputJsonValue,
          totalCharges: 0,
        },
      });
    }
    
    return usage;
  }

  /**
   * Find usage record by user and month
   */
  async findByUserAndMonth(userId: string, month: string): Promise<UsageRecord | null> {
    return await prisma.usageRecord.findUnique({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
    });
  }

  /**
   * Find all usage records for a user
   */
  async findByUserId(userId: string): Promise<UsageRecord[]> {
    return await prisma.usageRecord.findMany({
      where: { userId },
      orderBy: { month: 'desc' },
    });
  }

  /**
   * Increment usage metrics
   */
  async incrementUsage(
    userId: string,
    field: 'formsCreated' | 'fieldsGenerated' | 'apiCallsMade' | 'aiQuestionsGenerated',
    amount: number = 1
  ): Promise<UsageRecord> {
    await this.getOrCreateCurrentMonthUsage(userId);
    const month = this.getCurrentMonth();
    
    return await prisma.usageRecord.update({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
      data: {
        [field]: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Add usage-based charge
   */
  async addCharge(userId: string, charge: any): Promise<UsageRecord> {
    const usage = await this.getOrCreateCurrentMonthUsage(userId);
    const month = this.getCurrentMonth();
    
    const charges = Array.isArray(usage.charges) ? [...(usage.charges as any[]), charge] : [charge];
    const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0);
    
    return await prisma.usageRecord.update({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
      data: {
        charges: charges as Prisma.InputJsonValue,
        totalCharges,
      },
    });
  }

  /**
   * Create usage event
   */
  async createEvent(eventData: Partial<Omit<UsageEvent, 'id' | 'timestamp'>>): Promise<UsageEvent> {
    return await prisma.usageEvent.create({
      data: {
        userId: eventData.userId || '',
        eventType: eventData.eventType || 'api_call',
        category: eventData.category as any,
        units: eventData.units as any,
        resourceId: eventData.resourceId,
        metadata: eventData.metadata as Prisma.InputJsonValue || {},
      },
    });
  }

  /**
   * Get usage events for a user
   */
  async getEvents(userId: string, limit: number = 100): Promise<UsageEvent[]> {
    return await prisma.usageEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
