import { Form } from '../models/form.model';
import { prisma } from '../config/prisma.config';
import { Prisma } from '@prisma/client';

export class FormRepository {
  /**
   * Create a new form
   */
  async create(formData: Partial<Omit<Form, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Form> {
    return await prisma.form.create({
      data: {
        userId: formData.userId || '',
        title: formData.title || 'Untitled Form',
        description: formData.description,
        pages: formData.pages || [{ id: 'page_1', title: 'Page 1' }] as Prisma.InputJsonValue,
        fields: formData.fields || [] as Prisma.InputJsonValue,
        visibility: formData.visibility || 'private',
        version: 1,
        metadata: formData.metadata as Prisma.InputJsonValue || {},
      },
    });
  }

  /**
   * Find form by ID
   */
  async findById(formId: string): Promise<Form | null> {
    return await prisma.form.findUnique({
      where: { id: formId },
    });
  }

  /**
   * Find all forms by user ID
   */
  async findByUserId(userId: string, limit?: number): Promise<Form[]> {
    return await prisma.form.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });
  }

  /**
   * Find public forms
   */
  async findPublicForms(limit: number = 20): Promise<Form[]> {
    return await prisma.form.findMany({
      where: { visibility: 'public' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Update form
   */
  async update(formId: string, updates: Partial<Omit<Form, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Form> {
    return await prisma.form.update({
      where: { id: formId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.pages && { pages: updates.pages as Prisma.InputJsonValue }),
        ...(updates.fields && { fields: updates.fields as Prisma.InputJsonValue }),
        ...(updates.visibility && { visibility: updates.visibility }),
        ...(updates.version !== undefined && { version: updates.version + 1 }),
        ...(updates.metadata && { metadata: updates.metadata as Prisma.InputJsonValue }),
      },
    });
  }

  /**
   * Delete form
   */
  async delete(formId: string): Promise<void> {
    await prisma.form.delete({
      where: { id: formId },
    });
  }

  /**
   * Count forms by user
   */
  async countByUserId(userId: string): Promise<number> {
    return await prisma.form.count({
      where: { userId },
    });
  }

  /**
   * Count fields in a form
   */
  async countFieldsInForm(formId: string): Promise<number> {
    const form = await this.findById(formId);
    if (!form) return 0;
    
    const fields = form.fields as any[];
    return Array.isArray(fields) ? fields.length : 0;
  }
}
