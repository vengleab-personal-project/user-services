import { PolicyModel } from '../models/policy.model';
import { prisma } from '../config/prisma.config';
import { PolicyEffect } from '../types/abac.types';
import { Prisma } from '@prisma/client';

export class PolicyRepository {
  /**
   * Create a new policy
   */
  async create(policyData: Partial<Omit<PolicyModel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PolicyModel> {
    return await prisma.policy.create({
      data: {
        name: policyData.name || '',
        description: policyData.description,
        resource: policyData.resource || '*',
        action: policyData.action || '*',
        effect: (policyData.effect || PolicyEffect.DENY) as any,
        conditions: policyData.conditions as Prisma.InputJsonValue,
        priority: policyData.priority || 0,
        userId: policyData.userId,
        enabled: policyData.enabled !== false,
      },
    });
  }

  /**
   * Find policy by ID
   */
  async findById(policyId: string): Promise<PolicyModel | null> {
    return await prisma.policy.findUnique({
      where: { id: policyId },
    });
  }

  /**
   * Find all policies
   */
  async findAll(): Promise<PolicyModel[]> {
    return await prisma.policy.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Find policies by user ID
   */
  async findByUserId(userId: string): Promise<PolicyModel[]> {
    return await prisma.policy.findMany({
      where: { userId },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Find policies by resource and action
   */
  async findByResourceAndAction(resource: string, action: string): Promise<PolicyModel[]> {
    return await prisma.policy.findMany({
      where: {
        enabled: true,
        OR: [
          { resource: resource },
          { resource: '*' },
        ],
        AND: [
          {
            OR: [
              { action: action },
              { action: '*' },
            ],
          },
        ],
      },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Update policy
   */
  async update(policyId: string, updates: Partial<Omit<PolicyModel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PolicyModel> {
    return await prisma.policy.update({
      where: { id: policyId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.resource && { resource: updates.resource }),
        ...(updates.action && { action: updates.action }),
        ...(updates.effect && { effect: updates.effect as any }),
        ...(updates.conditions !== undefined && { conditions: updates.conditions as Prisma.InputJsonValue }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.userId !== undefined && { userId: updates.userId }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      },
    });
  }

  /**
   * Delete policy
   */
  async delete(policyId: string): Promise<void> {
    await prisma.policy.delete({
      where: { id: policyId },
    });
  }

  /**
   * Enable/disable policy
   */
  async setEnabled(policyId: string, enabled: boolean): Promise<PolicyModel> {
    return await this.update(policyId, { enabled });
  }
}
