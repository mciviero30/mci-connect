import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BACKEND PERMISSION ENFORCEMENT MIDDLEWARE
 * 
 * PHASE 4: Unified permission validation for sensitive operations
 * 
 * Call this from any backend function that needs permission checks
 * Returns validation result with user role context
 */

// Role hierarchy (matches frontend roleRules.js)
const ROLE_LEVELS = {
  'ceo': 100,
  'admin': 100,
  'manager': 80,
  'supervisor': 70,
  'foreman': 60,
  'technician': 50,
  'employee': 10
};

const ADMIN_POSITIONS = ['CEO', 'administrator', 'manager'];
const ADMIN_DEPARTMENTS = ['HR', 'administration'];

/**
 * Get effective role from user object
 */
function getUserRole(user) {
  if (!user) return 'employee';

  // 1. Check role field
  if (user.role && ROLE_LEVELS[user.role]) {
    return user.role;
  }

  // 2. Check position
  if (user.position === 'CEO') return 'ceo';
  if (ADMIN_POSITIONS.includes(user.position)) return 'admin';
  if (user.position === 'supervisor') return 'supervisor';
  if (user.position === 'foreman') return 'foreman';
  if (user.position === 'technician') return 'technician';

  // 3. Check department
  if (ADMIN_DEPARTMENTS.includes(user.department)) return 'admin';

  return 'employee';
}

/**
 * Check if user has full admin access
 */
function hasFullAccess(user) {
  const role = getUserRole(user);
  return ROLE_LEVELS[role] >= 80; // manager, admin, ceo
}

/**
 * Check specific permission
 */
function hasPermission(user, requiredLevel) {
  const role = getUserRole(user);
  const userLevel = ROLE_LEVELS[role] || 0;
  const required = typeof requiredLevel === 'string' ? ROLE_LEVELS[requiredLevel] : requiredLevel;
  return userLevel >= required;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, required_permission } = await req.json();

    if (!user_id) {
      return Response.json({ 
        authorized: false, 
        error: 'user_id required' 
      }, { status: 400 });
    }

    // Fetch user
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = users[0];

    if (!user) {
      return Response.json({
        authorized: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check permission
    const role = getUserRole(user);
    const isAdmin = hasFullAccess(user);
    const hasRequiredPermission = required_permission 
      ? hasPermission(user, required_permission)
      : true;

    // Log permission check
    console.log('[BACKEND PERMISSIONS]', {
      user_email: user.email,
      role: role,
      required_permission: required_permission,
      authorized: hasRequiredPermission,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      authorized: hasRequiredPermission,
      user: {
        id: user.id,
        email: user.email,
        role: role,
        level: ROLE_LEVELS[role] || 0,
        is_admin: isAdmin
      }
    });

  } catch (error) {
    console.error('[BACKEND PERMISSIONS] Error:', error.message);
    return Response.json({ 
      authorized: false, 
      error: error.message 
    }, { status: 500 });
  }
});

// Export helpers for use in other backend functions
export { getUserRole, hasFullAccess, hasPermission, ROLE_LEVELS };