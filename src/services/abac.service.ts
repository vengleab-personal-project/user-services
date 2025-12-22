import { ABACPolicy, ABACEvaluationContext, PolicyEvaluationResult, PolicyEffect, Condition, TimeCondition, GeoCondition } from '../types/abac.types';
import { PolicyRepository } from '../repositories/policy.repository';
import { defaultPolicies } from '../config/abac.config';
import { logger } from '../utils/logger';
import { PolicyEffect as PrismaPolicyEffect } from '@prisma/client';

export class ABACService {
  private policyRepository: PolicyRepository;
  private cachedPolicies: ABACPolicy[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.policyRepository = new PolicyRepository();
  }

  /**
   * Load and cache policies
   */
  private async loadPolicies(): Promise<ABACPolicy[]> {
    const now = Date.now();
    
    // Return cached policies if still valid
    if (this.cachedPolicies.length > 0 && now - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.cachedPolicies;
    }

    // Load custom policies from database
    const customPolicies = await this.policyRepository.findAll();

    // Combine default and custom policies, mapping Prisma types to ABAC types
    this.cachedPolicies = [
      ...defaultPolicies,
      ...customPolicies
        .filter(p => p.enabled)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          resource: p.resource,
          action: p.action,
          effect: p.effect === PrismaPolicyEffect.allow ? PolicyEffect.ALLOW : PolicyEffect.DENY,
          conditions: p.conditions as any || undefined,
          priority: p.priority,
          userId: p.userId || undefined,
          enabled: p.enabled,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        } as ABACPolicy))
    ];
    this.lastCacheUpdate = now;
    
    return this.cachedPolicies;
  }

  /**
   * Evaluate a condition against context
   */
  private evaluateCondition(condition: Condition, value: any): boolean {
    const { operator, value: expectedValue } = condition;

    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'notEquals':
        return value !== expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(value);
      case 'notIn':
        return Array.isArray(expectedValue) && !expectedValue.includes(value);
      case 'greater':
        return value > expectedValue;
      case 'less':
        return value < expectedValue;
      case 'greaterOrEqual':
        return value >= expectedValue;
      case 'lessOrEqual':
        return value <= expectedValue;
      case 'contains':
        return typeof value === 'string' && value.includes(expectedValue);
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(expectedValue);
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Evaluate time-based conditions
   */
  private evaluateTimeCondition(timeCondition: TimeCondition): boolean {
    const now = new Date();

    // Check date range
    if (timeCondition.before && now > new Date(timeCondition.before)) {
      return false;
    }
    if (timeCondition.after && now < new Date(timeCondition.after)) {
      return false;
    }

    // Check hour range
    if (timeCondition.hours) {
      const currentHour = now.getHours();
      const { start, end } = timeCondition.hours;
      if (start <= end) {
        // Normal range (e.g., 9-17)
        if (currentHour < start || currentHour >= end) {
          return false;
        }
      } else {
        // Overnight range (e.g., 22-6)
        if (currentHour < start && currentHour >= end) {
          return false;
        }
      }
    }

    // Check days of week
    if (timeCondition.daysOfWeek) {
      const currentDay = now.getDay();
      if (!timeCondition.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate geo-location conditions
   */
  private evaluateGeoCondition(geoCondition: GeoCondition, requestCountry?: string): boolean {
    if (!requestCountry) {
      return true; // Allow if country is unknown
    }

    if (geoCondition.allowedCountries) {
      return geoCondition.allowedCountries.includes(requestCountry);
    }

    if (geoCondition.deniedCountries) {
      return !geoCondition.deniedCountries.includes(requestCountry);
    }

    return true;
  }

  /**
   * Evaluate custom JavaScript expression
   */
  private evaluateCustomExpression(expression: string, context: ABACEvaluationContext): boolean {
    try {
      // Create a safe evaluation context
      const { user, resource, subscription } = context;
      
      // Use Function constructor for evaluation (safer than eval)
      // eslint-disable-next-line no-new-func
      const func = new Function('user', 'resource', 'subscription', `return ${expression}`);
      return func(user, resource, subscription);
    } catch (error) {
      logger.error('Error evaluating custom expression', { expression, error });
      return false;
    }
  }

  /**
   * Check if a policy matches the context
   */
  private policyMatches(policy: ABACPolicy, context: ABACEvaluationContext): boolean {
    // Check resource match
    if (policy.resource !== '*' && policy.resource !== context.resource.type) {
      // Check for wildcard patterns like 'form:*'
      const policyResourceBase = policy.resource.split(':')[0];
      const contextResourceBase = context.resource.type.split(':')[0];
      if (policyResourceBase !== contextResourceBase && policy.resource !== '*') {
        return false;
      }
    }

    // Check action match
    if (policy.action !== '*' && policy.action !== context.action) {
      return false;
    }

    // Check user-specific policy
    if (policy.userId && policy.userId !== context.user.id) {
      return false;
    }

    // Evaluate conditions
    if (policy.conditions) {
      const { userAttribute, resourceAttribute, resourceOwnership, time, geo, custom } = policy.conditions;

      // User attribute condition
      if (userAttribute) {
        const userValue = context.user[userAttribute.field];
        if (!this.evaluateCondition(userAttribute, userValue)) {
          return false;
        }
      }

      // Resource attribute condition
      if (resourceAttribute) {
        const resourceValue = context.resource[resourceAttribute.field];
        if (!this.evaluateCondition(resourceAttribute, resourceValue)) {
          return false;
        }
      }

      // Resource ownership condition
      if (resourceOwnership) {
        const resourceValue = context.resource[resourceOwnership.field];
        // Replace {{user.id}} placeholder
        const expectedValue = resourceOwnership.value === '{{user.id}}' ? context.user.id : resourceOwnership.value;
        if (!this.evaluateCondition({ ...resourceOwnership, value: expectedValue }, resourceValue)) {
          return false;
        }
      }

      // Time-based condition
      if (time) {
        if (!this.evaluateTimeCondition(time)) {
          return false;
        }
      }

      // Geo-location condition
      if (geo) {
        if (!this.evaluateGeoCondition(geo, context.request?.country)) {
          return false;
        }
      }

      // Custom expression
      if (custom) {
        if (!this.evaluateCustomExpression(custom, context)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate policies for a given context
   */
  async evaluate(context: ABACEvaluationContext): Promise<PolicyEvaluationResult> {
    const policies = await this.loadPolicies();
    
    // Filter and sort policies by priority (higher first)
    const applicablePolicies = policies
      .filter(policy => this.policyMatches(policy, context))
      .sort((a, b) => b.priority - a.priority);

    const deniedBy: string[] = [];
    const allowedBy: string[] = [];

    // Evaluate policies
    for (const policy of applicablePolicies) {
      if (policy.effect === PolicyEffect.DENY) {
        deniedBy.push(policy.id);
      } else if (policy.effect === PolicyEffect.ALLOW) {
        allowedBy.push(policy.id);
      }
    }

    // DENY takes precedence over ALLOW
    const allowed = deniedBy.length === 0 && allowedBy.length > 0;

    logger.debug('ABAC evaluation', {
      userId: context.user.id,
      resource: context.resource.type,
      action: context.action,
      allowed,
      deniedBy,
      allowedBy,
    });

    return {
      allowed,
      deniedBy: deniedBy.length > 0 ? deniedBy : undefined,
      allowedBy: allowedBy.length > 0 ? allowedBy : undefined,
    };
  }

  /**
   * Filter fields based on ABAC policies
   * Used for field-level access control
   */
  async filterFields(context: ABACEvaluationContext, fields: any[]): Promise<any[]> {
    const filteredFields = [];

    for (const field of fields) {
      const fieldContext: ABACEvaluationContext = {
        ...context,
        resource: {
          ...context.resource,
          type: `${context.resource.type}:field`,
          ...field,
        },
      };

      const result = await this.evaluate(fieldContext);
      if (result.allowed) {
        filteredFields.push(field);
      }
    }

    return filteredFields;
  }

  /**
   * Clear policy cache (call after updating policies)
   */
  clearCache(): void {
    this.cachedPolicies = [];
    this.lastCacheUpdate = 0;
  }
}


