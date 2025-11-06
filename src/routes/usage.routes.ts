import { Router, Request, Response } from 'express';
import { UsageService } from '../services/usage.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { User } from '../models/user.model';

const router: Router = Router();
const usageService = new UsageService();

/**
 * Get current month usage
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const usage = await usageService.getCurrentMonthUsage(user.id);
    res.json({ usage });
  })
);

/**
 * Get usage history
 */
router.get(
  '/me/history',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const history = await usageService.getUsageHistory(user.id);
    res.json({ history, count: history.length });
  })
);

/**
 * Get recent usage events
 */
router.get(
  '/me/events',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const events = await usageService.getRecentEvents(user.id, limit);
    res.json({ events, count: events.length });
  })
);

export default router;


