import { UsageRepository } from '../repositories/usage.repository';
import { UserRepository } from '../repositories/user.repository';
import { UsageRecord, UsageEvent } from '../models/usage.model';
import { logger } from '../utils/logger';

export class UsageService {
  private usageRepository: UsageRepository;
  private userRepository: UserRepository;

  constructor() {
    this.usageRepository = new UsageRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Track API call
   */
  async trackApiCall(userId: string, resourceId?: string, metadata?: Record<string, any>): Promise<void> {
    try {
      // Increment usage counter
      await this.usageRepository.incrementUsage(userId, 'apiCallsMade', 1);
      await this.userRepository.incrementStats(userId, 'totalApiCalls', 1);

      // Create usage event
      await this.usageRepository.createEvent({
        userId,
        eventType: 'api_call',
        resourceId,
        metadata,
      });
    } catch (error) {
      logger.error('Error tracking API call', { userId, error });
    }
  }

  /**
   * Track form creation
   */
  async trackFormCreated(userId: string, formId: string, metadata?: Record<string, any>): Promise<void> {
    try {
      // Increment usage counter
      await this.usageRepository.incrementUsage(userId, 'formsCreated', 1);

      // Update user stats
      await this.userRepository.incrementStats(userId, 'formCount', 1);

      // Create usage event
      await this.usageRepository.createEvent({
        userId,
        eventType: 'form_created',
        resourceId: formId,
        metadata,
      });

      logger.debug('Form creation tracked', { userId, formId });
    } catch (error) {
      logger.error('Error tracking form creation', { userId, formId, error });
    }
  }

  /**
   * Track form deletion
   */
  async trackFormDeleted(userId: string, formId: string, metadata?: Record<string, any>): Promise<void> {
    try {
      // Decrement user stats
      const stats = await this.userRepository.getStats(userId);
      if (stats && stats.formCount > 0) {
        await this.userRepository.updateStats(userId, {
          formCount: stats.formCount - 1,
        });
      }

      // Create usage event
      await this.usageRepository.createEvent({
        userId,
        eventType: 'form_deleted',
        resourceId: formId,
        metadata,
      });

      logger.debug('Form deletion tracked', { userId, formId });
    } catch (error) {
      logger.error('Error tracking form deletion', { userId, formId, error });
    }
  }

  /**
   * Track field generation (e.g., AI-generated fields)
   */
  async trackFieldsGenerated(userId: string, count: number, formId?: string, metadata?: Record<string, any>): Promise<void> {
    try {
      // Increment usage counter
      await this.usageRepository.incrementUsage(userId, 'fieldsGenerated', count);

      // Update user stats
      await this.userRepository.incrementStats(userId, 'fieldCount', count);

      // Create usage event
      await this.usageRepository.createEvent({
        userId,
        eventType: 'field_generated',
        resourceId: formId,
        metadata: { ...metadata, count },
      });

      logger.debug('Fields generation tracked', { userId, count, formId });
    } catch (error) {
      logger.error('Error tracking fields generation', { userId, count, error });
    }
  }

  /**
   * Track AI questions generation
   */
  async trackAIQuestionsGenerated(userId: string, count: number, metadata?: Record<string, any>): Promise<void> {
    try {
      // Increment usage counter
      await this.usageRepository.incrementUsage(userId, 'aiQuestionsGenerated', count);

      // Create usage event
      await this.usageRepository.createEvent({
        userId,
        eventType: 'ai_questions_generated',
        category: 'ai',
        units: 'requests',
        metadata: { ...metadata, count },
      });

      logger.debug('AI questions generation tracked', { userId, count });
    } catch (error) {
      logger.error('Error tracking AI questions generation', { userId, count, error });
    }
  }

  /**
   * Get current month usage for user
   */
  async getCurrentMonthUsage(userId: string): Promise<UsageRecord> {
    return await this.usageRepository.getOrCreateCurrentMonthUsage(userId);
  }

  /**
   * Get usage history for user
   */
  async getUsageHistory(userId: string): Promise<UsageRecord[]> {
    return await this.usageRepository.findByUserId(userId);
  }

  /**
   * Get recent usage events
   */
  async getRecentEvents(userId: string, limit: number = 100): Promise<UsageEvent[]> {
    return await this.usageRepository.getEvents(userId, limit);
  }

}


