import { Request, Response, NextFunction } from 'express';
import { ABACService } from '../services/abac.service';
import { ABACEvaluationContext } from '../types/abac.types';
import { UserRepository } from '../repositories/user.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';

const abacService = new ABACService();
const userRepository = new UserRepository();
const subscriptionRepository = new SubscriptionRepository();

/**
 * ABAC authorization middleware factory
 * @param resourceType - Type of resource (e.g., 'form', 'user')
 * @param action - Action being performed (e.g., 'read', 'write', 'delete')
 * @param resourceExtractor - Function to extract resource from request
 */
export const checkAbac = (
  resourceType: string,
  action: string,
  resourceExtractor?: (req: Request) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = req.user as User;

      // Get user stats
      const userStats = await userRepository.getStats(user.id);
      const subscription = await subscriptionRepository.findByUserId(user.id);

      // Extract resource information
      let resource: any = {
        type: resourceType,
      };

      if (resourceExtractor) {
        const extractedResource = await resourceExtractor(req);
        resource = { ...resource, ...extractedResource };
      }

      // Build ABAC context
      const context: ABACEvaluationContext = {
        user: {
          id: user.id,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          email: user.email,
          stats: {
            formCount: userStats?.formCount || 0,
            fieldCount: userStats?.fieldCount || 0,
            apiCallsThisMonth: userStats?.apiCallsThisMonth || 0,
          },
        },
        resource,
        action,
        subscription: subscription
          ? {
              limits: subscription.limits,
            }
          : undefined,
        request: {
          ip: req.ip,
          timestamp: new Date(),
        },
      };

      // Evaluate ABAC policies
      const result = await abacService.evaluate(context);

      if (!result.allowed) {
        logger.warn('ABAC authorization denied', {
          userId: user.id,
          resource: resourceType,
          action,
          deniedBy: result.deniedBy,
        });

        res.status(403).json({
          error: 'Access denied by policy',
          deniedBy: result.deniedBy,
        });
        return;
      }

      // Attach ABAC context to request for later use
      req.abacContext = {
        allowedFields: result.filteredFields,
        deniedActions: [],
      };

      next();
    } catch (error) {
      logger.error('ABAC middleware error', { error });
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Field-level ABAC filtering middleware
 * Filters response fields based on ABAC policies
 */
export const filterFields = (fieldsPath: string = 'fields') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (body && req.user) {
        const user = req.user as User;
        // If response contains fields, filter them
        const fields = getNestedProperty(body, fieldsPath);
        if (Array.isArray(fields)) {
          // Filter fields based on ABAC context
          const filteredFields = fields.filter((field) => {
            // Simple filtering - can be enhanced with more complex logic
            if (field.isPremium && user.subscriptionTier === 'free') {
              return false;
            }
            return true;
          });
          setNestedProperty(body, fieldsPath, filteredFields);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

// Helper to get nested property
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Helper to set nested property
function setNestedProperty(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => acc[part], obj);
  if (last) {
    target[last] = value;
  }
}


