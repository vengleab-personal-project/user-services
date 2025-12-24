import { Router, Request, Response } from 'express';
import passport from '../config/oauth.config';
import { OAuthService } from '../services/oauth.service';
import { SessionService } from '../services/session.service';
import { JWTService } from '../services/jwt.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { strictRateLimiter } from '../middleware/rateLimit.middleware';
import { config } from '../config';

const router: Router = Router();
const oauthService = new OAuthService();
const sessionService = new SessionService();

/**
 * Google OAuth
 */
router.get('/google', strictRateLimiter, (req, res, next) => {
  const redirectBase = (req.query.redirect as string) || config.frontend.url;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: encodeURIComponent(redirectBase),
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const redirectBase = req.query.state ? decodeURIComponent(req.query.state as string) : config.frontend.url;

  passport.authenticate('google', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      res.redirect(`${redirectBase}/login?error=oauth_failed`);
      return;
    }

    // Type assertion to extend req.user with the expected OAuth profile properties
    const oauthUser = user as typeof user & {
      oauthId: string;
      email?: string;
      name?: string;
      avatar?: string;
    };
    const { tokens } = await oauthService.handleOAuthCallback(
      'google',
      oauthUser.oauthId,
      {
        email: oauthUser.email ?? '',
        name: oauthUser.name ?? '',
        avatar: oauthUser.avatar,
      },
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    );

    res.redirect(`${redirectBase}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  })(req, res, next);
});

/**
 * GitHub OAuth
 */
router.get('/github', strictRateLimiter, (req, res, next) => {
  const redirectBase = (req.query.redirect as string) || config.frontend.url;
  passport.authenticate('github', {
    scope: ['user:email'],
    state: encodeURIComponent(redirectBase),
  })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  const redirectBase = req.query.state ? decodeURIComponent(req.query.state as string) : config.frontend.url;

  passport.authenticate('github', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      res.redirect(`${redirectBase}/login?error=oauth_failed`);
      return;
    }

    // Type assertion to extend req.user with the expected OAuth profile properties
    const oauthUser = user as typeof user & {
      oauthId: string;
      email?: string;
      name?: string;
      avatar?: string;
    };
    const { tokens } = await oauthService.handleOAuthCallback(
      'github',
      oauthUser.oauthId,
      {
        email: oauthUser.email ?? '',
        name: oauthUser.name ?? '',
        avatar: oauthUser.avatar,
      },
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    );

    res.redirect(`${redirectBase}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  })(req, res, next);
});

/**
 * Verify access token (for genai-service)
 */
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token required' });
      return;
    }

    try {
      const payload = JWTService.verifyToken(token);
      res.json({ valid: true, user: payload });
    } catch (error) {
      res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
  })
);

/**
 * Refresh access token
 */
router.post(
  '/refresh',
  strictRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const tokens = await oauthService.refreshAccessToken(refreshToken);

    res.json(tokens);
  })
);

/**
 * Logout
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (userId) {
      await oauthService.logout(userId);
    }
    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * Get current user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: req.user });
  })
);

/**
 * Get user sessions
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const sessions = await sessionService.getUserSessions(userId);
    res.json({ sessions });
  })
);

/**
 * Get active sessions
 */
router.get(
  '/sessions/active',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const sessions = await sessionService.getActiveSessions(userId);
    res.json({ sessions });
  })
);

/**
 * Revoke a specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    await sessionService.revokeSession(req.params.sessionId, userId);
    res.json({ message: 'Session revoked successfully' });
  })
);

/**
 * Revoke all sessions except current
 */
router.post(
  '/sessions/revoke-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const { exceptCurrentSession } = req.body;
    const currentSessionId = exceptCurrentSession ? req.body.currentSessionId : undefined;

    await sessionService.revokeAllSessions(userId, currentSessionId);
    res.json({ message: 'All sessions revoked successfully' });
  })
);

export default router;
