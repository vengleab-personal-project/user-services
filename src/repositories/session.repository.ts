import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TableNames } from '../config/dynamodb.config';
import { Session, CreateSessionInput } from '../models/session.model';
import { logger } from '../utils/logger';

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = TableNames.Sessions;

export class SessionRepository {
  /**
   * Create a new session
   */
  async create(input: CreateSessionInput): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: uuidv4(),
      ...input,
      isActive: true,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${session.userId}`,
            SK: `SESSION#${session.id}`,
            Type: 'Session',
            ...session,
          },
        })
      );

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
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      const { PK, SK, Type, ...session } = result.Item;
      return session as Session;
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
      // Use TokenHashIndex GSI for efficient lookup
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'TokenHashIndex',
          KeyConditionExpression: 'tokenHash = :tokenHash',
          FilterExpression: 'isActive = :active',
          ExpressionAttributeValues: {
            ':tokenHash': tokenHash,
            ':active': true,
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const { PK, SK, Type, ...session } = result.Items[0];
      return session as Session;
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
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'SESSION#',
          },
        })
      );

      if (!result.Items) {
        return [];
      }

      return result.Items.map((item) => {
        const { PK, SK, Type, ...session } = item;
        return session as Session;
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
    const sessions = await this.findByUserId(userId);
    return sessions.filter((session) => session.isActive && new Date(session.expiresAt) > new Date());
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
          UpdateExpression: 'SET lastActivityAt = :now, updatedAt = :now',
          ExpressionAttributeValues: {
            ':now': now,
          },
        })
      );
    } catch (error) {
      logger.error('Error updating session activity', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Deactivate session
   */
  async deactivate(sessionId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
          UpdateExpression: 'SET isActive = :false, updatedAt = :now',
          ExpressionAttributeValues: {
            ':false': false,
            ':now': now,
          },
        })
      );

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
    const sessions = await this.findActiveByUserId(userId);

    try {
      await Promise.all(
        sessions.map((session) => this.deactivate(session.id, userId))
      );

      logger.info('All sessions deactivated for user', { userId, count: sessions.length });
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
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `SESSION#${sessionId}`,
          },
        })
      );

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
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: '#type = :type AND expiresAt < :now',
          ExpressionAttributeNames: {
            '#type': 'Type',
          },
          ExpressionAttributeValues: {
            ':type': 'Session',
            ':now': new Date().toISOString(),
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return 0;
      }

      // Delete expired sessions
      await Promise.all(
        result.Items.map((item) => {
          const session = item as any;
          return this.delete(session.id, session.userId);
        })
      );

      logger.info('Expired sessions cleaned up', { count: result.Items.length });
      return result.Items.length;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error });
      throw error;
    }
  }
}

