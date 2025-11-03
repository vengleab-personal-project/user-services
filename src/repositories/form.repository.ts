import { Form } from '../models/form.model';
import { DynamoDBUtils } from '../utils/dynamodb.utils';
import { TableNames } from '../config/dynamodb.config';

export class FormRepository {
  /**
   * Create a new form
   */
  async create(formData: Partial<Form>): Promise<Form> {
    const form: Form = {
      id: DynamoDBUtils.generateId('form'),
      userId: formData.userId || '',
      title: formData.title || 'Untitled Form',
      description: formData.description,
      pages: formData.pages || [{ id: 'page_1', title: 'Page 1' }],
      fields: formData.fields || [],
      visibility: formData.visibility || 'private',
      version: 1,
      createdAt: DynamoDBUtils.getTimestamp(),
      updatedAt: DynamoDBUtils.getTimestamp(),
      metadata: formData.metadata || {},
    };

    await DynamoDBUtils.put(TableNames.Forms, form);
    return form;
  }

  /**
   * Find form by ID
   */
  async findById(formId: string): Promise<Form | null> {
    return await DynamoDBUtils.get<Form>(TableNames.Forms, { id: formId });
  }

  /**
   * Find all forms by user ID
   */
  async findByUserId(userId: string, limit?: number): Promise<Form[]> {
    return await DynamoDBUtils.query<Form>(
      TableNames.Forms,
      '#userId = :userId',
      { '#userId': 'userId' },
      { ':userId': userId },
      'UserIdIndex',
      limit
    );
  }

  /**
   * Find public forms
   */
  async findPublicForms(limit: number = 20): Promise<Form[]> {
    return await DynamoDBUtils.scan<Form>(
      TableNames.Forms,
      '#visibility = :visibility',
      { ':visibility': 'public' }
    );
  }

  /**
   * Update form
   */
  async update(formId: string, updates: Partial<Form>): Promise<Form> {
    const updatedForm = await DynamoDBUtils.update(
      TableNames.Forms,
      { id: formId },
      {
        ...updates,
        updatedAt: DynamoDBUtils.getTimestamp(),
        version: updates.version ? updates.version + 1 : undefined,
      }
    );
    return updatedForm as Form;
  }

  /**
   * Delete form
   */
  async delete(formId: string): Promise<void> {
    await DynamoDBUtils.delete(TableNames.Forms, { id: formId });
  }

  /**
   * Count forms by user
   */
  async countByUserId(userId: string): Promise<number> {
    const forms = await this.findByUserId(userId);
    return forms.length;
  }

  /**
   * Count fields in a form
   */
  async countFieldsInForm(formId: string): Promise<number> {
    const form = await this.findById(formId);
    return form ? form.fields.length : 0;
  }
}


