import { User, UserStats } from '../models/user.model';
import { DynamoDBUtils } from '../utils/dynamodb.utils';
import { TableNames } from '../config/dynamodb.config';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: Partial<User>): Promise<User> {
    const user: User = {
      id: DynamoDBUtils.generateId('user'),
      email: userData.email || '',
      name: userData.name || '',
      avatar: userData.avatar,
      role: userData.role || 'user',
      oauthProvider: userData.oauthProvider || 'google',
      oauthId: userData.oauthId || '',
      subscriptionTier: userData.subscriptionTier || 'free',
      createdAt: DynamoDBUtils.getTimestamp(),
      updatedAt: DynamoDBUtils.getTimestamp(),
      lastLoginAt: DynamoDBUtils.getTimestamp(),
      metadata: userData.metadata || {},
    };

    await DynamoDBUtils.put(TableNames.Users, user);

    // Initialize user stats with id as primary key
    const stats: UserStats = {
      userId: user.id,
      formCount: 0,
      fieldCount: 0,
      apiCallsThisMonth: 0,
      totalApiCalls: 0,
      storageUsed: 0,
      lastUpdated: DynamoDBUtils.getTimestamp(),
    };
    // Add id for DynamoDB primary key requirement
    await DynamoDBUtils.put(TableNames.Users, { 
      id: `${user.id}#STATS`, 
      ...stats 
    });

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return await DynamoDBUtils.get<User>(TableNames.Users, { id: userId });
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const items = await DynamoDBUtils.scan<User>(TableNames.Users);
    // Filter out stats entries and only return actual users
    return items.filter(item => !item.id.includes('#STATS') && item.email);
  }

  /**
   * Find user by email (using GSI)
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await DynamoDBUtils.query<User>(
      TableNames.Users,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email },
      'EmailIndex',
      1
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Find user by OAuth provider and ID (using GSI)
   */
  async findByOAuthProvider(provider: string, oauthId: string): Promise<User | null> {
    const users = await DynamoDBUtils.query<User>(
      TableNames.Users,
      '#provider = :provider AND #oauthId = :oauthId',
      { '#provider': 'oauthProvider', '#oauthId': 'oauthId' },
      { ':provider': provider, ':oauthId': oauthId },
      'OAuthIndex',
      1
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Update user
   */
  async update(userId: string, updates: Partial<User>): Promise<User> {
    const updatedUser = await DynamoDBUtils.update(
      TableNames.Users,
      { id: userId },
      { ...updates, updatedAt: DynamoDBUtils.getTimestamp() }
    );
    return updatedUser as User;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<User> {
    return await this.update(userId, { lastLoginAt: DynamoDBUtils.getTimestamp() });
  }

  /**
   * Delete user
   */
  async delete(userId: string): Promise<void> {
    await DynamoDBUtils.delete(TableNames.Users, { id: userId });
    await DynamoDBUtils.delete(TableNames.Users, { id: `${userId}#STATS` });
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<UserStats | null> {
    return await DynamoDBUtils.get<UserStats>(TableNames.Users, { id: `${userId}#STATS` });
  }

  /**
   * Update user statistics
   */
  async updateStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    const updatedStats = await DynamoDBUtils.update(
      TableNames.Users,
      { id: `${userId}#STATS` },
      { ...updates, lastUpdated: DynamoDBUtils.getTimestamp() }
    );
    return updatedStats as UserStats;
  }

  /**
   * Increment user statistics
   */
  async incrementStats(userId: string, field: keyof Pick<UserStats, 'formCount' | 'fieldCount' | 'apiCallsThisMonth' | 'totalApiCalls'>, amount: number = 1): Promise<void> {
    const stats = await this.getStats(userId);
    if (stats) {
      const currentValue = stats[field] || 0;
      await this.updateStats(userId, { [field]: currentValue + amount } as Partial<UserStats>);
    }
  }
}


