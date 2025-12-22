import { ABACPolicy } from '../types/abac.types';

/**
 * Default ABAC Policies
 * These are baseline policies loaded on startup
 * Custom policies can be added per-user in PostgreSQL
 */
export const defaultPolicies: ABACPolicy[] = [
  // Form ownership policies
  // {
  //   id: 'policy_form_owner_full_access',
  //   name: 'Form Owner Full Access',
  //   description: 'Form owners have full access to their forms',
  //   resource: 'form',
  //   action: '*',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     resourceOwnership: {
  //       field: 'userId',
  //       operator: 'equals',
  //       value: '{{user.id}}',
  //     },
  //   },
  //   priority: 100,
  // },
  
  // // Public form read access
  // {
  //   id: 'policy_public_form_read',
  //   name: 'Public Form Read Access',
  //   description: 'Anyone can read public forms',
  //   resource: 'form',
  //   action: 'read',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     resourceAttribute: {
  //       field: 'visibility',
  //       operator: 'equals',
  //       value: 'public',
  //     },
  //   },
  //   priority: 50,
  // },
  
  // // Field-level access based on tier
  // {
  //   id: 'policy_premium_fields',
  //   name: 'Premium Field Access',
  //   description: 'Pro and Enterprise users can access premium fields',
  //   resource: 'form:field',
  //   action: 'read',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     userAttribute: {
  //       field: 'subscriptionTier',
  //       operator: 'in',
  //       value: ['pro', 'enterprise'],
  //     },
  //     resourceAttribute: {
  //       field: 'isPremium',
  //       operator: 'equals',
  //       value: true,
  //     },
  //   },
  //   priority: 80,
  // },
  
  // // Time-based access example
  // {
  //   id: 'policy_business_hours_only',
  //   name: 'Business Hours Only',
  //   description: 'Certain resources only accessible during business hours (demo)',
  //   resource: 'analytics',
  //   action: 'read',
  //   effect: PolicyEffect.DENY,
  //   conditions: {
  //     time: {
  //       hours: { start: 0, end: 8 }, // Deny access between midnight and 8am
  //     },
  //   },
  //   priority: 90,
  // },
  
  // // Admin full access
  // {
  //   id: 'policy_admin_full_access',
  //   name: 'Admin Full Access',
  //   description: 'Admins have full access to all resources',
  //   resource: '*',
  //   action: '*',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     userAttribute: {
  //       field: 'role',
  //       operator: 'equals',
  //       value: 'admin',
  //     },
  //   },
  //   priority: 200,
  // },

  // // User management - Admin only
  // {
  //   id: 'policy_user_management_admin_only',
  //   name: 'User Management - Admin Only',
  //   description: 'Only admins can manage users',
  //   resource: 'user',
  //   action: '*',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     userAttribute: {
  //       field: 'role',
  //       operator: 'equals',
  //       value: 'admin',
  //     },
  //   },
  //   priority: 180,
  // },

  // // Non-admin users cannot manage other users
  // {
  //   id: 'policy_user_management_deny_non_admin',
  //   name: 'User Management - Deny Non-Admin',
  //   description: 'Non-admin users cannot manage other users',
  //   resource: 'user',
  //   action: 'list',
  //   effect: PolicyEffect.DENY,
  //   conditions: {
  //     userAttribute: {
  //       field: 'role',
  //       operator: 'notEquals',
  //       value: 'admin',
  //     },
  //   },
  //   priority: 190,
  // },

  // // Policy management - Admin only
  // {
  //   id: 'policy_management_admin_only',
  //   name: 'Policy Management - Admin Only',
  //   description: 'Only admins can manage ABAC policies',
  //   resource: 'policy',
  //   action: '*',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     userAttribute: {
  //       field: 'role',
  //       operator: 'equals',
  //       value: 'admin',
  //     },
  //   },
  //   priority: 180,
  // },

  // // Non-admin users cannot access policies
  // {
  //   id: 'policy_management_deny_non_admin',
  //   name: 'Policy Management - Deny Non-Admin',
  //   description: 'Non-admin users cannot access ABAC policies',
  //   resource: 'policy',
  //   action: '*',
  //   effect: PolicyEffect.DENY,
  //   conditions: {
  //     userAttribute: {
  //       field: 'role',
  //       operator: 'notEquals',
  //       value: 'admin',
  //     },
  //   },
  //   priority: 190,
  // },

  // // Users can manage their own profile
  // {
  //   id: 'policy_self_user_access',
  //   name: 'Self User Profile Access',
  //   description: 'Users can access and update their own profile',
  //   resource: 'user',
  //   action: 'read',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     resourceOwnership: {
  //       field: 'id',
  //       operator: 'equals',
  //       value: '{{user.id}}',
  //     },
  //   },
  //   priority: 100,
  // },
  
  // // Subscription tier limits
  // {
  //   id: 'policy_free_tier_form_limit',
  //   name: 'Free Tier Form Creation Limit',
  //   description: 'Free tier users cannot exceed form limit',
  //   resource: 'form',
  //   action: 'create',
  //   effect: PolicyEffect.DENY,
  //   conditions: {
  //     userAttribute: {
  //       field: 'subscriptionTier',
  //       operator: 'equals',
  //       value: 'free',
  //     },
  //     custom: 'user.stats.formCount >= subscription.limits.forms',
  //   },
  //   priority: 150,
  // },
  
  // // Enterprise custom policy support
  // {
  //   id: 'policy_enterprise_custom_policies',
  //   name: 'Enterprise Custom Policies',
  //   description: 'Enterprise users can create custom policies',
  //   resource: 'policy',
  //   action: 'create',
  //   effect: PolicyEffect.ALLOW,
  //   conditions: {
  //     userAttribute: {
  //       field: 'subscriptionTier',
  //       operator: 'equals',
  //       value: 'enterprise',
  //     },
  //   },
  //   priority: 100,
  // },
  
  // // Geo-location based access (example)
  // {
  //   id: 'policy_geo_restricted',
  //   name: 'Geo-Restricted Content',
  //   description: 'Certain content restricted by geography',
  //   resource: 'form:sensitive',
  //   action: 'read',
  //   effect: PolicyEffect.DENY,
  //   conditions: {
  //     geo: {
  //       allowedCountries: ['US', 'CA', 'UK', 'EU'],
  //     },
  //   },
  //   priority: 120,
  // },
];

/**
 * Policy evaluation order:
 * 1. Policies are evaluated in priority order (higher first)
 * 2. If any DENY policy matches, access is denied immediately
 * 3. If any ALLOW policy matches and no DENY, access is allowed
 * 4. If no policies match, access is denied (default deny)
 */

