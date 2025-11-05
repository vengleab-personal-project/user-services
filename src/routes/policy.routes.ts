import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { PolicyRepository } from '../repositories/policy.repository';
import { logger } from '../utils/logger';

const router = Router();
const policyRepository = new PolicyRepository();

// List all policies (admin only)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const policies = await policyRepository.findAll();
    res.json({ policies });
  } catch (error) {
    logger.error('Failed to list policies', { error });
    res.status(500).json({ error: 'Failed to list policies' });
  }
});

// Get policy by id (admin only)
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const policy = await policyRepository.findById(id);
    if (!policy) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json({ policy });
  } catch (error) {
    logger.error('Failed to get policy', { error });
    res.status(500).json({ error: 'Failed to get policy' });
  }
});

export default router;


