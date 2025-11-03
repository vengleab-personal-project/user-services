import { PolicyModel } from '../models/policy.model';
import { DynamoDBUtils } from '../utils/dynamodb.utils';
import { TableNames } from '../config/dynamodb.config';
import { PolicyEffect } from '../types/abac.types';

export class PolicyRepository {
  /**
   * Create a new policy
   */
  async create(policyData: Partial<PolicyModel>): Promise<PolicyModel> {
    const policy: PolicyModel = {
      id: DynamoDBUtils.generateId('policy'),
      name: policyData.name || '',
      description: policyData.description,
      resource: policyData.resource || '*',
      action: policyData.action || '*',
      effect: policyData.effect || PolicyEffect.DENY,
      conditions: policyData.conditions,
      priority: policyData.priority || 0,
      userId: policyData.userId,
      enabled: policyData.enabled !== false,
      createdAt: DynamoDBUtils.getTimestamp(),
      updatedAt: DynamoDBUtils.getTimestamp(),
    };

    await DynamoDBUtils.put(TableNames.Policies, policy);
    return policy;
  }

  /**
   * Find policy by ID
   */
  async findById(policyId: string): Promise<PolicyModel | null> {
    return await DynamoDBUtils.get<PolicyModel>(TableNames.Policies, { id: policyId });
  }

  /**
   * Find all policies
   */
  async findAll(): Promise<PolicyModel[]> {
    return await DynamoDBUtils.scan<PolicyModel>(TableNames.Policies);
  }

  /**
   * Find policies by user ID
   */
  async findByUserId(userId: string): Promise<PolicyModel[]> {
    return await DynamoDBUtils.query<PolicyModel>(
      TableNames.Policies,
      '#userId = :userId',
      { '#userId': 'userId' },
      { ':userId': userId },
      'UserIdIndex'
    );
  }

  /**
   * Find policies by resource and action
   */
  async findByResourceAndAction(resource: string, action: string): Promise<PolicyModel[]> {
    const allPolicies = await this.findAll();
    return allPolicies.filter(
      (policy) =>
        policy.enabled &&
        (policy.resource === resource || policy.resource === '*') &&
        (policy.action === action || policy.action === '*')
    );
  }

  /**
   * Update policy
   */
  async update(policyId: string, updates: Partial<PolicyModel>): Promise<PolicyModel> {
    const updatedPolicy = await DynamoDBUtils.update(
      TableNames.Policies,
      { id: policyId },
      { ...updates, updatedAt: DynamoDBUtils.getTimestamp() }
    );
    return updatedPolicy as PolicyModel;
  }

  /**
   * Delete policy
   */
  async delete(policyId: string): Promise<void> {
    await DynamoDBUtils.delete(TableNames.Policies, { id: policyId });
  }

  /**
   * Enable/disable policy
   */
  async setEnabled(policyId: string, enabled: boolean): Promise<PolicyModel> {
    return await this.update(policyId, { enabled });
  }
}


