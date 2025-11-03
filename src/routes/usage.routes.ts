import { Router, Request, Response } from 'express';
import { UsageService } from '../services/usage.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const usageService = new UsageService();

/**
 * Get current month usage
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const usage = await usageService.getCurrentMonthUsage(req.user!.id);
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
    const history = await usageService.getUsageHistory(req.user!.id);
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const events = await usageService.getRecentEvents(req.user!.id, limit);
    res.json({ events, count: events.length });
  })
);

export default router;


