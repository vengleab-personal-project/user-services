import { Router, Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { authenticate } from '../middleware/auth.middleware';
import { checkAbac } from '../middleware/abac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody } from '../utils/validation.utils';
import { z } from 'zod';

const routes: Router = Router();
const userRepository = new UserRepository();

/**
 * Get current user profile
 */
routes.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const stats = await userRepository.getStats(userId);
    res.json({
      user: req.user,
      stats,
    });
  })
);

/**
 * Update current user profile
 */
routes.patch(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatar: z.string().url().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const updates = validateBody(updateSchema, req.body);
    const updatedUser = await userRepository.update(userId, updates);

    res.json({ user: updatedUser });
  })
);

/**
 * Get user statistics
 */
routes.get(
  '/me/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const stats = await userRepository.getStats(userId);
    res.json({ stats });
  })
);

/**
 * Admin: Get all users (ABAC protected)
 */
routes.get(
  '/',
  authenticate,
  checkAbac('user', 'list'),
  asyncHandler(async (_req: Request, res: Response) => {
    // Get all users from repository
    const users = await userRepository.findAll();
    res.json({ users });
  })
);

/**
 * Admin: Get user by ID (ABAC protected)
 */
routes.get(
  '/:userId',
  authenticate,
  checkAbac('user', 'read', async (req) => {
    const user = await userRepository.findById(req.params.userId);
    return user ? { id: user.id, userId: user.id } : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userRepository.findById(req.params.userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stats = await userRepository.getStats(user.id);
    res.json({ user, stats });
  })
);

/**
 * Admin: Update user (ABAC protected)
 */
routes.patch(
  '/:userId',
  authenticate,
  checkAbac('user', 'update', async (req) => {
    const user = await userRepository.findById(req.params.userId);
    return user ? { id: user.id, userId: user.id } : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const updateSchema = z.object({
      role: z.enum(['user', 'admin', 'editor']).optional(),
      subscriptionTier: z.enum(['free', 'pro', 'enterprise']).optional(),
      metadata: z.record(z.any()).optional(),
    });

    const updates = validateBody(updateSchema, req.body);
    const updatedUser = await userRepository.update(req.params.userId, updates);

    res.json({ user: updatedUser });
  })
);

/**
 * Delete current user account
 */
routes.delete(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    await userRepository.delete(userId);
    res.json({ message: 'Account deleted successfully' });
  })
);

export default routes;


