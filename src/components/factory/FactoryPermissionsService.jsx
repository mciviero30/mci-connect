/**
 * Factory Permissions Service
 * 
 * Strict role-based access control for Factory operations
 */

import { base44 } from '@/api/base44Client';

/**
 * Factory roles with production privileges
 */
const FACTORY_ROLES = ['admin', 'manager', 'factory_manager', 'production_manager'];

/**
 * Check if user has factory role
 */
export async function hasFactoryRole(user) {
  if (!user) return false;
  
  const role = user.role?.toLowerCase();
  const position = user.position?.toLowerCase() || '';
  
  // Check explicit roles
  if (FACTORY_ROLES.includes(role)) {
    return true;
  }
  
  // Check position-based roles
  if (
    position.includes('factory') ||
    position.includes('production') ||
    position.includes('fabrication')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Check if user can change production status
 */
export async function canChangeProductionStatus(user) {
  return await hasFactoryRole(user);
}

/**
 * Check if user can add factory annotations
 */
export async function canAddFactoryAnnotations(user) {
  return await hasFactoryRole(user);
}

/**
 * Check if user can export production data
 */
export async function canExportProductionData(user) {
  return await hasFactoryRole(user);
}

/**
 * Validate permission and throw if unauthorized
 */
export async function requireFactoryRole(user, action) {
  const hasPermission = await hasFactoryRole(user);
  
  if (!hasPermission) {
    throw new Error(
      `Unauthorized: ${action} requires factory role. ` +
      `User ${user.email} (${user.role}) does not have factory privileges.`
    );
  }
  
  return true;
}

/**
 * Get user permissions summary
 */
export async function getUserPermissions(user) {
  const isFactory = await hasFactoryRole(user);
  
  return {
    is_factory_user: isFactory,
    can_change_status: isFactory,
    can_annotate: isFactory,
    can_export: isFactory,
    access_mode: isFactory ? 'read-write' : 'read-only',
    role: user.role,
    position: user.position
  };
}