/**
 * Dimension Set Permissions
 * 
 * Role-based access control for dimension set workflow
 */

/**
 * User roles
 */
export const ROLES = {
  TECHNICIAN: 'technician',
  SUPERVISOR: 'supervisor',
  PRODUCTION: 'production',
  ADMIN: 'admin'
};

/**
 * Determine user role
 */
export function getUserRole(user) {
  if (!user) return null;
  
  // Admin role check
  if (user.role === 'admin') {
    return ROLES.ADMIN;
  }
  
  // Position-based role detection
  const position = (user.position || '').toLowerCase();
  
  if (position.includes('supervisor') || position.includes('foreman') || position.includes('manager')) {
    return ROLES.SUPERVISOR;
  }
  
  if (position.includes('production') || position.includes('manufacturing')) {
    return ROLES.PRODUCTION;
  }
  
  // Department-based role detection
  const department = (user.department || '').toLowerCase();
  
  if (department.includes('production') || department.includes('manufacturing')) {
    return ROLES.PRODUCTION;
  }
  
  // Default to technician
  return ROLES.TECHNICIAN;
}

/**
 * Check permission for action
 */
export function checkPermission(user, action) {
  const role = getUserRole(user);
  
  const permissions = {
    // Technicians can only submit
    [ROLES.TECHNICIAN]: ['submit', 'view'],
    
    // Supervisors can approve and reject
    [ROLES.SUPERVISOR]: ['submit', 'approve', 'reject', 'view'],
    
    // Production can lock approved sets
    [ROLES.PRODUCTION]: ['lock', 'view'],
    
    // Admins have all permissions
    [ROLES.ADMIN]: ['submit', 'approve', 'reject', 'lock', 'view', 'unlock']
  };
  
  const userPermissions = permissions[role] || [];
  return userPermissions.includes(action);
}

/**
 * Check if user can modify dimension set
 */
export function canModifyDimensionSet(user, dimensionSet) {
  // No one can modify locked sets
  if (dimensionSet.is_locked) {
    return false;
  }
  
  const role = getUserRole(user);
  
  // Technicians can modify draft and rejected sets
  if (role === ROLES.TECHNICIAN) {
    return ['draft', 'rejected'].includes(dimensionSet.workflow_state);
  }
  
  // Supervisors can modify draft and rejected sets
  if (role === ROLES.SUPERVISOR) {
    return ['draft', 'rejected'].includes(dimensionSet.workflow_state);
  }
  
  // Production cannot modify sets, only lock approved ones
  if (role === ROLES.PRODUCTION) {
    return false;
  }
  
  // Admins can modify non-locked sets
  if (role === ROLES.ADMIN) {
    return !dimensionSet.is_locked;
  }
  
  return false;
}

/**
 * Check if user can view dimension set
 */
export function canViewDimensionSet(user, dimensionSet) {
  const role = getUserRole(user);
  
  // Everyone can view
  if (role === ROLES.TECHNICIAN || role === ROLES.SUPERVISOR) {
    return true;
  }
  
  // Production can only view approved and locked sets
  if (role === ROLES.PRODUCTION) {
    return ['approved', 'locked'].includes(dimensionSet.workflow_state);
  }
  
  // Admins can view all
  if (role === ROLES.ADMIN) {
    return true;
  }
  
  return false;
}

/**
 * Get allowed actions for user
 */
export function getAllowedActions(user, dimensionSet) {
  const actions = [];
  const role = getUserRole(user);
  
  if (!dimensionSet) return actions;
  
  // View is always allowed
  if (canViewDimensionSet(user, dimensionSet)) {
    actions.push('view');
  }
  
  // Locked sets have no actions
  if (dimensionSet.is_locked) {
    return actions;
  }
  
  const state = dimensionSet.workflow_state;
  
  switch (role) {
    case ROLES.TECHNICIAN:
      if (state === 'draft' || state === 'rejected') {
        actions.push('edit', 'submit');
      }
      break;
      
    case ROLES.SUPERVISOR:
      if (state === 'draft' || state === 'rejected') {
        actions.push('edit', 'submit');
      }
      if (state === 'submitted') {
        actions.push('approve', 'reject');
      }
      break;
      
    case ROLES.PRODUCTION:
      if (state === 'approved') {
        actions.push('lock');
      }
      break;
      
    case ROLES.ADMIN:
      if (state === 'draft' || state === 'rejected') {
        actions.push('edit', 'submit');
      }
      if (state === 'submitted') {
        actions.push('approve', 'reject');
      }
      if (state === 'approved') {
        actions.push('lock');
      }
      if (state === 'locked') {
        actions.push('unlock'); // Emergency unlock
      }
      break;
  }
  
  return actions;
}