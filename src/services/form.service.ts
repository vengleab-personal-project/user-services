import { FormRepository } from '../repositories/form.repository';
import { Form } from '../models/form.model';
import { UsageService } from './usage.service';
import { ABACService } from './abac.service';
import { logger } from '../utils/logger';

export class FormService {
  private formRepository: FormRepository;
  private usageService: UsageService;
  private abacService: ABACService;

  constructor() {
    this.formRepository = new FormRepository();
    this.usageService = new UsageService();
    this.abacService = new ABACService();
  }

  /**
   * Create a new form
   */
  async createForm(userId: string, formData: Partial<Form>): Promise<Form> {
    const form = await this.formRepository.create({
      ...formData,
      userId,
    });

    // Track form creation
    await this.usageService.trackFormCreated(userId, form.id, {
      title: form.title,
      visibility: form.visibility,
    });

    logger.info('Form created', { userId, formId: form.id });

    return form;
  }

  /**
   * Get form by ID
   */
  async getForm(formId: string): Promise<Form | null> {
    return await this.formRepository.findById(formId);
  }

  /**
   * Get user's forms
   */
  async getUserForms(userId: string, limit?: number): Promise<Form[]> {
    return await this.formRepository.findByUserId(userId, limit);
  }

  /**
   * Get public forms
   */
  async getPublicForms(limit: number = 20): Promise<Form[]> {
    return await this.formRepository.findPublicForms(limit);
  }

  /**
   * Update form
   */
  async updateForm(formId: string, updates: Partial<Form>): Promise<Form> {
    const form = await this.formRepository.update(formId, updates);

    logger.info('Form updated', { formId });

    return form;
  }

  /**
   * Delete form
   */
  async deleteForm(formId: string, userId: string): Promise<void> {
    await this.formRepository.delete(formId);

    // Track form deletion
    await this.usageService.trackFormDeleted(userId, formId);

    logger.info('Form deleted', { formId, userId });
  }

  /**
   * Count user's forms
   */
  async countUserForms(userId: string): Promise<number> {
    return await this.formRepository.countByUserId(userId);
  }

  /**
   * Filter form fields based on ABAC policies
   */
  async filterFormFields(form: Form, userId: string, userRole: string, subscriptionTier: string): Promise<Form> {
    const context = {
      user: {
        id: userId,
        role: userRole,
        subscriptionTier,
        email: '',
      },
      resource: {
        type: 'form',
        id: form.id,
        userId: form.userId,
        visibility: form.visibility,
      },
      action: 'read',
      request: {
        timestamp: new Date(),
      },
    };

    const fields = Array.isArray(form.fields) ? form.fields : [];
    const filteredFields = await this.abacService.filterFields(context, fields);

    return {
      ...form,
      fields: filteredFields,
    };
  }
}


