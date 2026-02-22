import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Universal permission enforcer for backend functions
 * Usage: await enforcePermission(base44, user, requiredRoles, action)
 */
export async function enforcePermission(
  base44,
  requiredRoles = ['admin'],
  action = 'access'
) {
  try {
    const user = await base44.auth.me();

    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    if (!requiredRoles.includes(user.role)) {
      console.warn(`[Permission Denied] User ${user.email} (${user.role}) attempted ${action}`);
      throw new Error(`Forbidden: ${user.role} cannot ${action}`);
    }

    return user;
  } catch (err) {
    console.error('[Permission Check Failed]:', err.message);
    throw err;
  }
}

/**
 * Check if user owns the resource (by user_id or created_by)
 */
export function isResourceOwner(resource, user) {
  return resource.user_id === user.id || resource.created_by === user.email;
}

/**
 * Admin-only operation guard
 */
export async function requireAdmin(base44) {
  const user = await enforcePermission(base44, ['admin'], 'admin operation');
  return user;
}

/**
 * Owner or Admin can access
 */
export async function requireOwnerOrAdmin(base44, resource) {
  const user = await base44.auth.me();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'admin') return user;

  if (!isResourceOwner(resource, user)) {
    throw new Error(`Forbidden: Can only access own resources`);
  }

  return user;
}