import { PolicyRepository } from '../src/repositories/policy.repository';
import { PolicyEffect, ABACPolicy } from '../src/types/abac.types';
import { logger } from '../src/utils/logger';

const policiesToSeed: Omit<ABACPolicy, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'policy_form_owner_full_access',
    name: 'Form Owner Full Access',
    description: 'Form owners have full access to their forms',
    resource: 'form',
    action: '*',
    effect: PolicyEffect.ALLOW,
    conditions: {
      resourceOwnership: {
        field: 'userId',
        operator: 'equals',
        value: '{{user.id}}',
      },
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'policy_public_form_read',
    name: 'Public Form Read Access',
    description: 'Anyone can read public forms',
    resource: 'form',
    action: 'read',
    effect: PolicyEffect.ALLOW,
    conditions: {
      resourceAttribute: {
        field: 'visibility',
        operator: 'equals',
        value: 'public',
      },
    },
    priority: 50,
    enabled: true,
  },
  {
    id: 'policy_premium_fields',
    name: 'Premium Field Access',
    description: 'Pro and Enterprise users can access premium fields',
    resource: 'form:field',
    action: 'read',
    effect: PolicyEffect.ALLOW,
    conditions: {
      userAttribute: {
        field: 'subscriptionTier',
        operator: 'in',
        value: ['pro', 'enterprise'],
      },
      resourceAttribute: {
        field: 'isPremium',
        operator: 'equals',
        value: true,
      },
    },
    priority: 80,
    enabled: true,
  },
  {
    id: 'policy_business_hours_only',
    name: 'Business Hours Only',
    description: 'Certain resources only accessible during business hours (demo)',
    resource: 'analytics',
    action: 'read',
    effect: PolicyEffect.DENY,
    conditions: {
      time: {
        hours: { start: 0, end: 8 },
      },
    },
    priority: 90,
    enabled: true,
  },
  {
    id: 'policy_admin_full_access',
    name: 'Admin Full Access',
    description: 'Admins have full access to all resources',
    resource: '*',
    action: '*',
    effect: PolicyEffect.ALLOW,
    conditions: {
      userAttribute: {
        field: 'role',
        operator: 'equals',
        value: 'admin',
      },
    },
    priority: 200,
    enabled: true,
  },
  {
    id: 'policy_user_management_admin_only',
    name: 'User Management - Admin Only',
    description: 'Only admins can manage users',
    resource: 'user',
    action: '*',
    effect: PolicyEffect.ALLOW,
    conditions: {
      userAttribute: {
        field: 'role',
        operator: 'equals',
        value: 'admin',
      },
    },
    priority: 180,
    enabled: true,
  },
  {
    id: 'policy_user_management_deny_non_admin',
    name: 'User Management - Deny Non-Admin',
    description: 'Non-admin users cannot manage other users',
    resource: 'user',
    action: 'list',
    effect: PolicyEffect.DENY,
    conditions: {
      userAttribute: {
        field: 'role',
        operator: 'notEquals',
        value: 'admin',
      },
    },
    priority: 190,
    enabled: true,
  },
  {
    id: 'policy_management_admin_only',
    name: 'Policy Management - Admin Only',
    description: 'Only admins can manage ABAC policies',
    resource: 'policy',
    action: '*',
    effect: PolicyEffect.ALLOW,
    conditions: {
      userAttribute: {
        field: 'role',
        operator: 'equals',
        value: 'admin',
      },
    },
    priority: 180,
    enabled: true,
  },
  {
    id: 'policy_management_deny_non_admin',
    name: 'Policy Management - Deny Non-Admin',
    description: 'Non-admin users cannot access ABAC policies',
    resource: 'policy',
    action: '*',
    effect: PolicyEffect.DENY,
    conditions: {
      userAttribute: {
        field: 'role',
        operator: 'notEquals',
        value: 'admin',
      },
    },
    priority: 190,
    enabled: true,
  },
  {
    id: 'policy_self_user_access',
    name: 'Self User Profile Access',
    description: 'Users can access and update their own profile',
    resource: 'user',
    action: 'read',
    effect: PolicyEffect.ALLOW,
    conditions: {
      resourceOwnership: {
        field: 'id',
        operator: 'equals',
        value: '{{user.id}}',
      },
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'policy_free_tier_form_limit',
    name: 'Free Tier Form Creation Limit',
    description: 'Free tier users cannot exceed form limit',
    resource: 'form',
    action: 'create',
    effect: PolicyEffect.DENY,
    conditions: {
      userAttribute: {
        field: 'subscriptionTier',
        operator: 'equals',
        value: 'free',
      },
      custom: 'user.stats.formCount >= subscription.limits.forms',
    },
    priority: 150,
    enabled: true,
  },
  {
    id: 'policy_enterprise_custom_policies',
    name: 'Enterprise Custom Policies',
    description: 'Enterprise users can create custom policies',
    resource: 'policy',
    action: 'create',
    effect: PolicyEffect.ALLOW,
    conditions: {
      userAttribute: {
        field: 'subscriptionTier',
        operator: 'equals',
        value: 'enterprise',
      },
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'policy_geo_restricted',
    name: 'Geo-Restricted Content',
    description: 'Certain content restricted by geography',
    resource: 'form:sensitive',
    action: 'read',
    effect: PolicyEffect.DENY,
    conditions: {
      geo: {
        allowedCountries: ['US', 'CA', 'UK', 'EU'],
      },
    },
    priority: 120,
    enabled: true,
  },
];

async function main(): Promise<void> {
  const repo = new PolicyRepository();
  let created = 0;
  for (const p of policiesToSeed) {
    try {
      const existing = await repo.findById(p.id);
      if (existing) {
        continue;
      }
      await repo.create({ ...p });
      created += 1;
    } catch (error) {
      logger.error('Failed to seed policy', { id: p.id, error });
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Seed complete. Created ${created} policies.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', err);
  process.exit(1);
});


