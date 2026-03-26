/**
 * CENTRALIZED PERMISSION HELPERS
 * Single source of truth for all permission checks in MCI Connect
 * 
 * FASE 2: Consolidates dispersed hasFullAccess, isAdmin checks
 */

/**
 * Check if user has administrative privileges
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo';
};

/**
 * Check if user has management privileges (can view team data)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isManager = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager';
};

/**
 * Check if user has supervisory privileges (can view assigned team data)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isSupervisor = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'supervisor';
};

/**
 * Check if user has foreman privileges (can manage job sites)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isForeman = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'supervisor' || user.role === 'foreman';
};

/**
 * Check if user can view financial data (salaries, costs, profits)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canViewFinancials = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo';
};

/**
 * Check if user can view ALL employee data (including sensitive info)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canViewAllEmployees = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager';
};

/**
 * Check if user can edit/create quotes and invoices
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canManageDocuments = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager';
};

/**
 * Check if user can approve time entries, expenses, driving logs
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canApproveTime = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'supervisor';
};

/**
 * Check if user can manage jobs (create, edit, delete)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canManageJobs = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager';
};

/**
 * Check if user can view job financials (costs, profit margins)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canViewJobFinancials = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo';
};

/**
 * Check if user can manage employee records (hire, fire, edit)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canManageEmployees = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo';
};

/**
 * Check if user can view payroll data
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const canViewPayroll = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'ceo';
};

/**
 * LEGACY ALIAS - Use isAdmin() instead
 * @deprecated Use isAdmin() for clarity
 */
export const hasFullAccess = (user) => {
  return isAdmin(user);
};