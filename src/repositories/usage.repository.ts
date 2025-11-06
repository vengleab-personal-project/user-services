import { UsageRecord, UsageEvent } from '../models/usage.model';
import { DynamoDBUtils } from '../utils/dynamodb.utils';
import { TableNames } from '../config/dynamodb.config';

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
    const key = { id: `${userId}#${month}` };
    
    let usage = await DynamoDBUtils.get<UsageRecord>(TableNames.Usage, key);
    
    if (!usage) {
      usage = {
        id: `${userId}#${month}`,
        userId,
        month,
        formsCreated: 0,
        fieldsGenerated: 0,
        apiCallsMade: 0,
        aiQuestionsGenerated: 0,
        charges: [],
        totalCharges: 0,
        createdAt: DynamoDBUtils.getTimestamp(),
        updatedAt: DynamoDBUtils.getTimestamp(),
      };
      await DynamoDBUtils.put(TableNames.Usage, usage);
    }
    
    return usage;
  }

  /**
   * Find usage record by user and month
   */
  async findByUserAndMonth(userId: string, month: string): Promise<UsageRecord | null> {
    return await DynamoDBUtils.get<UsageRecord>(TableNames.Usage, { id: `${userId}#${month}` });
  }

  /**
   * Find all usage records for a user
   */
  async findByUserId(userId: string): Promise<UsageRecord[]> {
    return await DynamoDBUtils.query<UsageRecord>(
      TableNames.Usage,
      'begins_with(#id, :userId)',
      { '#id': 'id' },
      { ':userId': `${userId}#` }
    );
  }

  /**
   * Increment usage metrics
   */
  async incrementUsage(
    userId: string,
    field: 'formsCreated' | 'fieldsGenerated' | 'apiCallsMade' | 'aiQuestionsGenerated',
    amount: number = 1
  ): Promise<UsageRecord> {
    const usage = await this.getOrCreateCurrentMonthUsage(userId);
    const currentValue = usage[field] || 0;
    
    const updatedUsage = await DynamoDBUtils.update(
      TableNames.Usage,
      { id: usage.id },
      {
        [field]: currentValue + amount,
        updatedAt: DynamoDBUtils.getTimestamp(),
      }
    );
    
    return updatedUsage as UsageRecord;
  }

  /**
   * Add usage-based charge
   */
  async addCharge(userId: string, charge: any): Promise<UsageRecord> {
    const usage = await this.getOrCreateCurrentMonthUsage(userId);
    const charges = [...usage.charges, charge];
    const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0);
    
    const updatedUsage = await DynamoDBUtils.update(
      TableNames.Usage,
      { id: usage.id },
      {
        charges,
        totalCharges,
        updatedAt: DynamoDBUtils.getTimestamp(),
      }
    );
    
    return updatedUsage as UsageRecord;
  }

  /**
   * Create usage event
   */
  async createEvent(eventData: Partial<UsageEvent>): Promise<UsageEvent> {
    const event: UsageEvent = {
      id: DynamoDBUtils.generateId('event'),
      userId: eventData.userId || '',
      eventType: eventData.eventType || 'api_call',
      resourceId: eventData.resourceId,
      metadata: eventData.metadata || {},
      timestamp: DynamoDBUtils.getTimestamp(),
    };

    await DynamoDBUtils.put(TableNames.Usage, { ...event, SK: 'EVENT' });
    return event;
  }

  /**
   * Get usage events for a user
   */
  async getEvents(userId: string, limit: number = 100): Promise<UsageEvent[]> {
    return await DynamoDBUtils.query<UsageEvent>(
      TableNames.Usage,
      '#userId = :userId AND #sk = :sk',
      { '#userId': 'userId', '#sk': 'SK' },
      { ':userId': userId, ':sk': 'EVENT' },
      undefined,
      limit
    );
  }
}


