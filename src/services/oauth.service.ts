import { UserRepository } from '../repositories/user.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { User } from '../models/user.model';
import { JWTService } from './jwt.service';
import { SessionService } from './session.service';
import { TokenResponse } from '../types/auth.types';
import { logger } from '../utils/logger';

export class OAuthService {
  private userRepository: UserRepository;
  private subscriptionRepository: SubscriptionRepository;
  private sessionService: SessionService;

  constructor() {
    this.userRepository = new UserRepository();
    this.subscriptionRepository = new SubscriptionRepository();
    this.sessionService = new SessionService();
  }

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(
    provider: 'google' | 'github',
    oauthId: string,
    profile: {
      email: string;
      name: string;
      avatar?: string;
    },
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      location?: string;
    }
  ): Promise<{ user: User; tokens: TokenResponse; isNewUser: boolean }> {
    try {
      // Try to find existing user
      let user = await this.userRepository.findByOAuthProvider(provider, oauthId);
      let isNewUser = false;

      if (!user) {
        // Create new user
        user = await this.userRepository.create({
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          oauthProvider: provider,
          oauthId,
          role: 'user',
          subscriptionTier: 'free',
        });

        // Create default free subscription
        await this.subscriptionRepository.create({
          userId: user.id,
          tier: 'free',
          status: 'active',
        });

        isNewUser = true;
        logger.info(`New user created via ${provider} OAuth`, { userId: user.id, email: user.email });
      } else {
        // Update last login
        user = await this.userRepository.updateLastLogin(user.id);
        logger.info(`User logged in via ${provider} OAuth`, { userId: user.id, email: user.email });
      }

      // Generate JWT tokens
      const tokens = JWTService.generateTokenPair(user);

      // Create session
      await this.sessionService.createSession(
        user.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        metadata
      );

      return { user, tokens, isNewUser };
    } catch (error) {
      logger.error('OAuth callback error', { error, provider, oauthId });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const payload = JWTService.verifyToken(refreshToken);

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token pair
      return JWTService.generateTokenPair(user);
    } catch (error) {
      logger.error('Refresh token error', { error });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate tokens and revoke session)
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Revoke specific session
        await this.sessionService.revokeSession(sessionId, userId);
      } else {
        // Revoke all sessions
        await this.sessionService.revokeAllSessions(userId);
      }
      logger.info('User logged out', { userId, sessionId });
    } catch (error) {
      logger.error('Logout error', { error, userId });
      throw error;
    }
  }
}


