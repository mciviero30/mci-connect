/**
 * roleRules.js - Centralized role logic for MCI Connect
 * 
 * Provides utility functions to determine user access levels
 * based on their role field in the User entity.
 */

/**
 * Roles with full administrative access
 */
const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'super_admin'];

/**
 * Roles with manager-level access (can see most things but not system config)
 */
const MANAGER_ROLES = ['manager', 'supervisor', 'foreman', ...ADMIN_ROLES];

/**
 * Returns true if the user has full admin/owner access
 * @param {Object} user - User object with a `role` field
 * @returns {boolean}
 */
export function hasFullAccess(user) {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role?.toLowerCase?.());
}

/**
 * Returns true if the user has manager-level access or above
 * @param {Object} user - User object with a `role` field
 * @returns {boolean}
 */
export function hasManagerAccess(user) {
  if (!user) return false;
  return MANAGER_ROLES.includes(user.role?.toLowerCase?.());
}

/**
 * Returns true if the user is a regular employee (no elevated access)
 * @param {Object} user - User object with a `role` field
 * @returns {boolean}
 */
export function isEmployee(user) {
  if (!user) return false;
  return !hasManagerAccess(user);
}

/**
 * Returns true if the user can approve payroll, commissions, etc.
 * @param {Object} user
 * @returns {boolean}
 */
export function canApprove(user) {
  return hasManagerAccess(user);
}

/**
 * Returns true if the user can view financial data
 * @param {Object} user
 * @returns {boolean}
 */
export function canViewFinancials(user) {
  return hasManagerAccess(user);
}

/**
 * Returns the user's display role label
 * @param {Object} user
 * @returns {string}
 */
export function getRoleLabel(user) {
  if (!user?.role) return 'Employee';
  const role = user.role.toLowerCase();
  const labels = {
    admin: 'Administrator',
    administrator: 'Administrator',
    owner: 'Owner',
    super_admin: 'Super Admin',
    manager: 'Manager',
    supervisor: 'Supervisor',
    foreman: 'Foreman',
    employee: 'Employee',
  };
  return labels[role] ?? user.role;
}
