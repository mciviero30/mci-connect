/**
 * Commission Agreement Permission Helpers
 * Controls access to commission agreements based on user role
 */

/**
 * Check if user can manage all commission agreements (CRUD)
 * @param {Object} user - Current user (merged profile)
 * @returns {boolean}
 */
export const canManageAllAgreements = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'admin' || role === 'ceo';
};

/**
 * Check if user can view/sign their own agreement
 * @param {Object} user - Current user (merged profile)
 * @returns {boolean}
 */
export const canViewOwnAgreement = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'manager' || role === 'admin' || role === 'ceo';
};

/**
 * Check if user can access a specific agreement
 * @param {Object} user - Current user (merged profile)
 * @param {Object} agreement - Commission agreement
 * @returns {boolean}
 */
export const canAccessAgreement = (user, agreement) => {
  if (!user || !agreement) return false;
  
  // CEO/Admin can access all
  if (canManageAllAgreements(user)) return true;
  
  // Manager can only access their own
  const role = (user.role || '').toLowerCase();
  if (role === 'manager') {
    return agreement.employee_email === user.email;
  }
  
  return false;
};

/**
 * Check if user can sign an agreement
 * @param {Object} user - Current user (merged profile)
 * @param {Object} agreement - Commission agreement
 * @returns {boolean}
 */
export const canSignAgreement = (user, agreement) => {
  if (!user || !agreement) return false;
  
  // Can't sign if already signed
  if (agreement.signed) return false;
  
  // Can't sign if not pending
  if (agreement.status !== 'pending') return false;
  
  // Must be assigned to this user
  if (agreement.employee_email !== user.email) return false;
  
  return true;
};