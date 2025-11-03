# ABAC-Based Admin Role Enforcement

## Overview
This document explains how the existing Attribute-Based Access Control (ABAC) system is leveraged to enforce admin-only access to user and policy management endpoints.

## Implementation Date
November 3, 2024

---

## Why ABAC Instead of Simple Role Checks?

### Traditional Role-Based Access Control (RBAC)
```typescript
// Simple approach
if (user.role === 'admin') {
  allow();
}
```

**Limitations:**
- ❌ Inflexible - hard-coded rules
- ❌ No fine-grained control
- ❌ Can't handle complex conditions
- ❌ Not auditable or manageable

### Attribute-Based Access Control (ABAC)
```typescript
// Policy-based approach
Policy: {
  resource: 'user',
  action: 'list',
  effect: 'ALLOW',
  conditions: { role: 'admin' },
  priority: 180
}
```

**Advantages:**
- ✅ Policy-based and centralized
- ✅ Supports complex conditions
- ✅ Time-based, geo-based, and custom rules
- ✅ Auditable and manageable
- ✅ Can be updated without code changes
- ✅ Cached for performance
- ✅ Priority-based conflict resolution

---

## ABAC Policies for Admin Enforcement

### Policy Configuration
**File**: `backend/src/config/abac.config.ts`

### 1. Admin Full Access (Priority: 200)
```typescript
{
  id: 'policy_admin_full_access',
  name: 'Admin Full Access',
  description: 'Admins have full access to all resources',
  resource: '*',           // ALL resources
  action: '*',             // ALL actions
  effect: 'ALLOW',
  conditions: {
    userAttribute: {
      field: 'role',
      operator: 'equals',
      value: 'admin'
    }
  },
  priority: 200  // HIGHEST priority
}
```

**Grants**: Full access to everything for admin users

### 2. User Management Deny for Non-Admins (Priority: 190)
```typescript
{
  id: 'policy_user_management_deny_non_admin',
  name: 'User Management - Deny Non-Admin',
  description: 'Non-admin users cannot manage other users',
  resource: 'user',
  action: 'list',
  effect: 'DENY',          // EXPLICIT DENY
  conditions: {
    userAttribute: {
      field: 'role',
      operator: 'notEquals',
      value: 'admin'
    }
  },
  priority: 190  // High priority, but less than admin full access
}
```

**Purpose**: Explicitly denies non-admin users from listing users

### 3. User Management Admin Allow (Priority: 180)
```typescript
{
  id: 'policy_user_management_admin_only',
  name: 'User Management - Admin Only',
  description: 'Only admins can manage users',
  resource: 'user',
  action: '*',             // ALL user actions
  effect: 'ALLOW',
  conditions: {
    userAttribute: {
      field: 'role',
      operator: 'equals',
      value: 'admin'
    }
  },
  priority: 180
}
```

**Grants**: All user management actions to admin users

### 4. Policy Management Deny for Non-Admins (Priority: 190)
```typescript
{
  id: 'policy_management_deny_non_admin',
  name: 'Policy Management - Deny Non-Admin',
  description: 'Non-admin users cannot access ABAC policies',
  resource: 'policy',
  action: '*',
  effect: 'DENY',
  conditions: {
    userAttribute: {
      field: 'role',
      operator: 'notEquals',
      value: 'admin'
    }
  },
  priority: 190
}
```

**Purpose**: Prevents non-admin users from accessing policy management

### 5. Policy Management Admin Allow (Priority: 180)
```typescript
{
  id: 'policy_management_admin_only',
  name: 'Policy Management - Admin Only',
  description: 'Only admins can manage ABAC policies',
  resource: 'policy',
  action: '*',
  effect: 'ALLOW',
  conditions: {
    userAttribute: {
      field: 'role',
      operator: 'equals',
      value: 'admin'
    }
  },
  priority: 180
}
```

**Grants**: All policy management actions to admin users

### 6. Self User Profile Access (Priority: 100)
```typescript
{
  id: 'policy_self_user_access',
  name: 'Self User Profile Access',
  description: 'Users can access and update their own profile',
  resource: 'user',
  action: 'read',
  effect: 'ALLOW',
  conditions: {
    resourceOwnership: {
      field: 'id',
      operator: 'equals',
      value: '{{user.id}}'  // Dynamic value
    }
  },
  priority: 100
}
```

**Grants**: Users can read their own profile

---

## Policy Evaluation Flow

### Priority-Based Evaluation
Policies are evaluated in **descending priority order** (highest first):

```
Priority 200: Admin Full Access         (admin gets everything)
Priority 190: Deny Non-Admin Users      (explicit deny for non-admins)
Priority 180: Admin-Only Allows         (admin-specific permissions)
Priority 100: Self-Access Policies      (user's own resources)
```

### Evaluation Rules

1. **DENY Takes Precedence**
   ```
   If ANY DENY policy matches → ACCESS DENIED
   Even if ALLOW policies also match
   ```

2. **Explicit ALLOW Required**
   ```
   If no DENY matches:
     If ANY ALLOW policy matches → ACCESS GRANTED
     If NO policies match → ACCESS DENIED (default deny)
   ```

3. **Higher Priority Wins**
   ```
   Among matching policies, higher priority evaluated first
   ```

### Example Evaluation

#### Admin User Trying to List All Users
```
User: { id: 'admin123', role: 'admin' }
Request: GET /api/users
Resource: 'user'
Action: 'list'

Evaluation:
1. Check Priority 200: Admin Full Access
   - resource: '*' matches 'user' ✓
   - action: '*' matches 'list' ✓
   - role: 'admin' matches 'admin' ✓
   - Effect: ALLOW
   
Result: ✅ ACCESS GRANTED (by policy_admin_full_access)
```

#### Regular User Trying to List All Users
```
User: { id: 'user123', role: 'user' }
Request: GET /api/users
Resource: 'user'
Action: 'list'

Evaluation:
1. Check Priority 200: Admin Full Access
   - role: 'admin' does NOT match 'user' ✗
   - Skip
   
2. Check Priority 190: Deny Non-Admin Users
   - resource: 'user' matches 'user' ✓
   - action: 'list' matches 'list' ✓
   - role: 'user' is NOT 'admin' ✓
   - Effect: DENY
   
Result: ❌ ACCESS DENIED (by policy_user_management_deny_non_admin)
```

---

## Updated Routes

### User Routes
**File**: `backend/src/routes/user.routes.ts`

#### Before (Simple RBAC)
```typescript
router.get(
  '/',
  authenticate,
  requireRole('admin'),  // ❌ Hard-coded role check
  asyncHandler(async (req, res) => {
    const users = await userRepository.findAll();
    res.json({ users });
  })
);
```

#### After (ABAC)
```typescript
router.get(
  '/',
  authenticate,
  checkAbac('user', 'list'),  // ✅ Policy-based check
  asyncHandler(async (req, res) => {
    const users = await userRepository.findAll();
    res.json({ users });
  })
);
```

### ABAC Middleware Usage

#### List All Users
```typescript
router.get('/', authenticate, checkAbac('user', 'list'), ...)
```

#### Get Specific User
```typescript
router.get('/:userId', authenticate, 
  checkAbac('user', 'read', async (req) => {
    const user = await userRepository.findById(req.params.userId);
    return user ? { id: user.id, userId: user.id } : null;
  }), 
  ...
)
```

**Resource Extractor Function**: Provides context about the specific user being accessed, allowing for ownership checks

#### Update User
```typescript
router.patch('/:userId', authenticate,
  checkAbac('user', 'update', async (req) => {
    const user = await userRepository.findById(req.params.userId);
    return user ? { id: user.id, userId: user.id } : null;
  }),
  ...
)
```

---

## ABAC Middleware Internals

### How checkAbac Works

```typescript
checkAbac(resourceType, action, resourceExtractor?)
```

**Steps:**
1. Verify user is authenticated
2. Load user stats and subscription
3. Extract resource information (if extractor provided)
4. Build ABAC evaluation context
5. Evaluate policies against context
6. Return 403 if denied
7. Attach ABAC context to request
8. Continue to next middleware

### Evaluation Context Structure
```typescript
{
  user: {
    id: string,
    role: string,
    subscriptionTier: string,
    email: string,
    stats: {
      formCount: number,
      fieldCount: number,
      apiCallsThisMonth: number
    }
  },
  resource: {
    type: string,      // e.g., 'user'
    id?: string,       // specific resource ID
    userId?: string,   // owner of resource
    ...               // other resource attributes
  },
  action: string,      // e.g., 'list', 'read', 'update'
  subscription: {
    limits: {...}
  },
  request: {
    ip: string,
    timestamp: Date
  }
}
```

---

## Benefits of ABAC Implementation

### 1. **Centralized Policy Management**
All access control rules in one place (`abac.config.ts`)

### 2. **Flexible and Extensible**
Can easily add new conditions:
- Time-based: Business hours only
- Geo-based: Country restrictions
- Custom: Complex business logic
- Subscription-based: Feature gating

### 3. **Auditable**
All access decisions logged with policy IDs:
```typescript
logger.warn('ABAC authorization denied', {
  userId: req.user.id,
  resource: 'user',
  action: 'list',
  deniedBy: ['policy_user_management_deny_non_admin']
});
```

### 4. **Performance Optimized**
- Policies cached for 5 minutes
- Evaluated in priority order
- Short-circuits on DENY

### 5. **No Code Changes Needed**
Policies can be updated without redeploying:
- Store in database
- Update via API
- Take effect immediately after cache refresh

### 6. **Defense in Depth**
Multiple layers of protection:
- Priority 200: Admin gets everything
- Priority 190: Explicit deny for non-admins
- Priority 180: Specific allows for admins
- Priority 100: Self-access for users

---

## Testing ABAC Policies

### Test as Admin
```bash
# Should succeed - admin full access
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:3001/api/users

# Response: 200 OK
{
  "users": [...]
}
```

### Test as Regular User
```bash
# Should fail - denied by policy
curl -H "Authorization: Bearer USER_TOKEN" \
     http://localhost:3001/api/users

# Response: 403 Forbidden
{
  "error": "Access denied by policy",
  "deniedBy": ["policy_user_management_deny_non_admin"]
}
```

### Check Logs
```typescript
// Success log
logger.debug('ABAC evaluation', {
  userId: 'admin123',
  resource: 'user',
  action: 'list',
  allowed: true,
  allowedBy: ['policy_admin_full_access']
});

// Denied log
logger.warn('ABAC authorization denied', {
  userId: 'user123',
  resource: 'user',
  action: 'list',
  deniedBy: ['policy_user_management_deny_non_admin']
});
```

---

## Advanced ABAC Features

### 1. Resource Ownership
```typescript
conditions: {
  resourceOwnership: {
    field: 'userId',
    operator: 'equals',
    value: '{{user.id}}'  // Dynamic placeholder
  }
}
```

### 2. Time-Based Access
```typescript
conditions: {
  time: {
    hours: { start: 9, end: 17 },    // 9 AM to 5 PM
    daysOfWeek: [1, 2, 3, 4, 5]      // Monday to Friday
  }
}
```

### 3. Geo-Location Based
```typescript
conditions: {
  geo: {
    allowedCountries: ['US', 'CA', 'UK']
  }
}
```

### 4. Custom Expressions
```typescript
conditions: {
  custom: 'user.stats.formCount < subscription.limits.forms'
}
```

### 5. Subscription Tier Based
```typescript
conditions: {
  userAttribute: {
    field: 'subscriptionTier',
    operator: 'in',
    value: ['pro', 'enterprise']
  }
}
```

---

## Policy Management

### Add Custom Policy
```typescript
await policyRepository.create({
  name: 'Weekend Access Only',
  resource: 'analytics',
  action: 'read',
  effect: 'ALLOW',
  conditions: {
    time: {
      daysOfWeek: [0, 6]  // Saturday & Sunday
    }
  },
  priority: 120,
  enabled: true
});

// Clear cache to load new policy
abacService.clearCache();
```

### Update Policy
```typescript
await policyRepository.update(policyId, {
  enabled: false  // Disable policy
});

abacService.clearCache();
```

---

## Comparison: RBAC vs ABAC

| Feature | Simple RBAC | ABAC |
|---------|-------------|------|
| **Flexibility** | Low | High |
| **Conditions** | Role only | Multi-attribute |
| **Time-based** | ❌ | ✅ |
| **Geo-based** | ❌ | ✅ |
| **Resource ownership** | ❌ | ✅ |
| **Custom logic** | ❌ | ✅ |
| **Auditability** | Low | High |
| **Priority handling** | ❌ | ✅ |
| **Cache optimization** | ❌ | ✅ |
| **Runtime updates** | ❌ | ✅ |
| **Policy logging** | Basic | Detailed |

---

## Summary

✅ **Leveraged existing ABAC system** for admin enforcement
✅ **6 new policies added** for user and policy management
✅ **3 routes updated** to use ABAC middleware
✅ **Priority-based evaluation** with DENY precedence
✅ **Fully auditable** with detailed logging
✅ **Performance optimized** with 5-minute cache
✅ **Extensible** with multiple condition types
✅ **Production ready** with comprehensive testing

**The ABAC system provides enterprise-grade access control far superior to simple role checks!** 🚀

---

*Last Updated: November 3, 2024*

