import { Router, Request, Response } from 'express';
import { FormService } from '../services/form.service';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { checkAbac } from '../middleware/abac.middleware';
import { checkLimits } from '../middleware/usageTracking.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, createFormSchema, updateFormSchema } from '../utils/validation.utils';
import { User } from '../models/user.model';

const router: Router = Router();
const formService = new FormService();

/**
 * Create a new form
 */
router.post(
  '/',
  authenticate,
  checkLimits('forms'),
  checkAbac('form', 'create'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const formData = validateBody(createFormSchema, req.body);
    const form = await formService.createForm(user.id, formData);
    res.status(201).json({ form });
  })
);

/**
 * Get user's forms
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const forms = await formService.getUserForms(user.id, limit);
    res.json({ forms, count: forms.length });
  })
);

/**
 * Get public forms
 */
router.get(
  '/public',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const forms = await formService.getPublicForms(limit);
    res.json({ forms, count: forms.length });
  })
);

/**
 * Get form by ID
 */
router.get(
  '/:formId',
  optionalAuth,
  checkAbac('form', 'read', async (req) => {
    const form = await formService.getForm(req.params.formId);
    return form ? { id: form.id, userId: form.userId, visibility: form.visibility } : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const form = await formService.getForm(req.params.formId);

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    // Filter fields based on ABAC policies if user is authenticated
    let filteredForm = form;
    const user = req.user as User | undefined;
    if (user && user.id) {
      filteredForm = await formService.filterFormFields(
        form,
        user.id,
        user.role,
        user.subscriptionTier
      );
    }

    res.json({ form: filteredForm });
  })
);

/**
 * Update form
 */
router.patch(
  '/:formId',
  authenticate,
  checkAbac('form', 'update', async (req) => {
    const form = await formService.getForm(req.params.formId);
    return form ? { id: form.id, userId: form.userId } : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const form = await formService.getForm(req.params.formId);

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    // Check ownership
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (form.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this form' });
      return;
    }

    const updates = validateBody(updateFormSchema, req.body);
    const updatedForm = await formService.updateForm(req.params.formId, updates);

    res.json({ form: updatedForm });
  })
);

/**
 * Delete form
 */
router.delete(
  '/:formId',
  authenticate,
  checkAbac('form', 'delete', async (req) => {
    const form = await formService.getForm(req.params.formId);
    return form ? { id: form.id, userId: form.userId } : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const form = await formService.getForm(req.params.formId);

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    // Check ownership
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (form.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this form' });
      return;
    }

    await formService.deleteForm(req.params.formId, user.id);

    res.json({ message: 'Form deleted successfully' });
  })
);

/**
 * Get form count for current user
 */
router.get(
  '/count/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const count = await formService.countUserForms(user.id);
    res.json({ count });
  })
);

export default router;


