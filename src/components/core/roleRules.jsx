/**
 * UNIFIED ROLE SYSTEM - MCI Connect
 * 
 * SINGLE SOURCE OF TRUTH for all access control
 * Consolidates 4 legacy systems into one
 */

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  CEO: 'ceo',
  ADMIN: 'admin',
  MANAGER: 'manager', 
  SUPERVISOR: 'supervisor',
  FOREMAN: 'foreman',
  TECHNICIAN: 'technician',
  EMPLOYEE: 'employee',
};

// ============================================
// ROLE HIERARCHY & PERMISSIONS
// ============================================

const ROLE_HIERARCHY = {
  ceo: {
    level: 100,
    label: 'CEO',
    fullAccess: true,
    permissions: {
      dashboard: { viewAll: true, editAll: true },
      jobs: { viewAll: true, create: true, edit: true, delete: true, viewFinancials: true },
      field: { viewAll: true, edit: true, uploadPhotos: true, manageTasks: true },
      employees: { viewAll: true, create: true, edit: true, delete: true, viewSalary: true },
      finance: { viewAll: true, create: true, edit: true, delete: true, approveExpenses: true },
      timeTracking: { viewAll: true, approve: true, editAll: true },
      payroll: { viewAll: true, manage: true },
      reports: { viewAll: true, viewFinancial: true, export: true },
      settings: { view: true, manageRoles: true, manageCompany: true },
      compliance: { view: true, manage: true },
    }
  },

  admin: {
    level: 100,
    label: 'Administrator',
    fullAccess: true,
    permissions: {
      dashboard: { viewAll: true, editAll: true },
      jobs: { viewAll: true, create: true, edit: true, delete: true, viewFinancials: true },
      field: { viewAll: true, edit: true, uploadPhotos: true, manageTasks: true },
      employees: { viewAll: true, create: true, edit: true, delete: true, viewSalary: true },
      finance: { viewAll: true, create: true, edit: true, delete: true, approveExpenses: true },
      timeTracking: { viewAll: true, approve: true, editAll: true },
      payroll: { viewAll: true, manage: true },
      reports: { viewAll: true, viewFinancial: true, export: true },
      settings: { view: true, manageRoles: true, manageCompany: true },
      compliance: { view: true, manage: true },
    }
  },
  
  manager: {
    level: 80,
    label: 'Manager',
    fullAccess: true, // Manager has admin-level access
    permissions: {
      dashboard: { viewAll: true, editAll: true },
      jobs: { viewAll: true, create: true, edit: true, delete: true, viewFinancials: true },
      field: { viewAll: true, edit: true, uploadPhotos: true, manageTasks: true },
      employees: { viewAll: true, create: true, edit: true, delete: false, viewSalary: true },
      finance: { viewAll: true, create: true, edit: true, delete: false, approveExpenses: true },
      timeTracking: { viewAll: true, approve: true, editAll: true },
      payroll: { viewAll: true, manage: false },
      reports: { viewAll: true, viewFinancial: true, export: true },
      settings: { view: true, manageRoles: false, manageCompany: false },
      compliance: { view: true, manage: false },
    }
  },

  supervisor: {
    level: 70,
    label: 'Supervisor',
    fullAccess: false, // Supervisor: Solo Field + gestión de tareas
    permissions: {
      dashboard: { viewAll: false, editAll: false },
      jobs: { viewAll: false, create: false, edit: false, delete: false, viewFinancials: false },
      field: { viewAll: true, edit: true, uploadPhotos: true, manageTasks: true },
      employees: { viewAll: false, create: false, edit: false, delete: false, viewSalary: false },
      finance: { viewAll: false, create: false, edit: false, delete: false, approveExpenses: false },
      timeTracking: { viewAll: false, approve: false, editAll: false },
      payroll: { viewAll: false, manage: false },
      reports: { viewAll: false, viewFinancial: false, export: false },
      settings: { view: false, manageRoles: false, manageCompany: false },
      compliance: { view: false, manage: false },
    }
  },

  foreman: {
    level: 60,
    label: 'Foreman',
    fullAccess: false,
    permissions: {
      dashboard: { viewAll: false, editAll: false },
      jobs: { viewAll: false, create: false, edit: false, delete: false, viewFinancials: false },
      field: { viewAll: false, edit: true, uploadPhotos: true, manageTasks: true },
      employees: { viewAll: false, create: false, edit: false, delete: false, viewSalary: false },
      finance: { viewAll: false, create: false, edit: false, delete: false, approveExpenses: false },
      timeTracking: { viewAll: false, approve: false, editAll: false },
      payroll: { viewAll: false, manage: false },
      reports: { viewAll: false, viewFinancial: false, export: false },
      settings: { view: false, manageRoles: false, manageCompany: false },
      compliance: { view: false, manage: false },
    }
  },

  technician: {
    level: 50,
    label: 'Technician',
    fullAccess: false,
    permissions: {
      dashboard: { viewAll: false, editAll: false },
      jobs: { viewAll: false, create: false, edit: false, delete: false, viewFinancials: false },
      field: { viewAll: false, edit: false, uploadPhotos: true, manageTasks: false },
      employees: { viewAll: false, create: false, edit: false, delete: false, viewSalary: false },
      finance: { viewAll: false, create: false, edit: false, delete: false, approveExpenses: false },
      timeTracking: { viewAll: false, approve: false, editAll: false },
      payroll: { viewAll: false, manage: false },
      reports: { viewAll: false, viewFinancial: false, export: false },
      settings: { view: false, manageRoles: false, manageCompany: false },
      compliance: { view: false, manage: false },
    }
  },

  employee: {
    level: 10,
    label: 'Employee',
    fullAccess: false,
    permissions: {
      dashboard: { viewAll: false, editAll: false },
      jobs: { viewAll: false, create: false, edit: false, delete: false, viewFinancials: false },
      field: { viewAll: false, edit: false, uploadPhotos: false, manageTasks: false },
      employees: { viewAll: false, create: false, edit: false, delete: false, viewSalary: false },
      finance: { viewAll: false, create: false, edit: false, delete: false, approveExpenses: false },
      timeTracking: { viewAll: false, approve: false, editAll: false },
      payroll: { viewAll: false, manage: false },
      reports: { viewAll: false, viewFinancial: false, export: false },
      settings: { view: false, manageRoles: false, manageCompany: false },
      compliance: { view: false, manage: false },
    }
  },
};

// ============================================
// LEGACY POSITION MAPPING
// ============================================

const LEGACY_POSITION_TO_ROLE = {
  'CEO': ROLES.CEO,
  'administrator': ROLES.ADMIN,
  'manager': ROLES.MANAGER,
  'supervisor': ROLES.SUPERVISOR,
  'foreman': ROLES.FOREMAN,
  'technician': ROLES.TECHNICIAN,
};

// ============================================
// LEGACY DEPARTMENT MAPPING
// ============================================

const ADMIN_DEPARTMENTS = ['HR', 'administration', 'CEO'];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get unified role from user object
 * Handles all legacy systems (role, position, department)
 */
export function getUserRole(user) {
  if (!user) return ROLES.EMPLOYEE;

  // 1. Check explicit role field (modern system)
  if (user.role && ROLE_HIERARCHY[user.role]) {
    return user.role;
  }

  // 2. 'user' is Base44's default platform role → always treated as employee
  // DO NOT fall back to position/department for 'user' role — prevents
  // regular employees from accidentally getting admin navigation
  if (user.role === 'user') {
    return ROLES.EMPLOYEE;
  }

  // 3. Map from legacy position field (only for users without an explicit role)
  if (user.position && LEGACY_POSITION_TO_ROLE[user.position]) {
    return LEGACY_POSITION_TO_ROLE[user.position];
  }

  // 4. Check admin departments (legacy)
  if (user.department && ADMIN_DEPARTMENTS.includes(user.department)) {
    return ROLES.ADMIN;
  }

  // 5. Default to employee
  return ROLES.EMPLOYEE;
}

/**
 * Check if user has full admin access
 */
export function hasFullAccess(user) {
  const role = getUserRole(user);
  return ROLE_HIERARCHY[role]?.fullAccess === true;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user, category, permission) {
  const role = getUserRole(user);
  const roleConfig = ROLE_HIERARCHY[role];
  
  if (!roleConfig) return false;
  if (roleConfig.fullAccess) return true;

  return roleConfig.permissions?.[category]?.[permission] === true;
}

/**
 * Get role level (for hierarchy comparison)
 */
export function getRoleLevel(user) {
  const role = getUserRole(user);
  return ROLE_HIERARCHY[role]?.level || 0;
}

/**
 * Check if user can manage another user
 */
export function canManageUser(currentUser, targetUser) {
  const currentLevel = getRoleLevel(currentUser);
  const targetLevel = getRoleLevel(targetUser);
  return currentLevel > targetLevel;
}

/**
 * Get user's display role label
 */
export function getRoleLabel(user) {
  const role = getUserRole(user);
  return ROLE_HIERARCHY[role]?.label || 'Employee';
}

/**
 * Check if role is CEO/Admin level
 */
export function isCEOOrAdmin(user) {
  const role = getUserRole(user);
  return role === ROLES.ADMIN || user?.role === 'ceo';
}

/**
 * Check if role is Manager level
 */
export function isManager(user) {
  const role = getUserRole(user);
  return role === ROLES.MANAGER || role === ROLES.ADMIN;
}

/**
 * Check if role is Supervisor level
 */
export function isSupervisor(user) {
  const role = getUserRole(user);
  return role === ROLES.SUPERVISOR;
}

/**
 * Check if user can approve (manager, supervisor, or admin)
 */
export function canApprove(user) {
  return hasFullAccess(user);
}

/**
 * Check if user can create financial documents (quotes, invoices)
 */
export function canCreateFinancialDocs(user) {
  const role = getUserRole(user);
  return role === ROLES.CEO || role === ROLES.ADMIN || role === ROLES.MANAGER;
}

/**
 * Check if document needs approval based on user role
 */
export function needsApproval(user) {
  const role = getUserRole(user);
  // Only non-admin roles need approval
  return role !== ROLES.CEO && role !== ROLES.ADMIN;
}

/**
 * Check if user can send/email documents
 */
export function canSendDocument(user) {
  const role = getUserRole(user);
  return role === ROLES.CEO || role === ROLES.ADMIN || role === ROLES.MANAGER;
}

// ============================================
// NAVIGATION ACCESS
// ============================================

/**
 * Get navigation items based on role
 */
export function getNavigationForRole(user) {
  const role = getUserRole(user);
  const roleConfig = ROLE_HIERARCHY[role];

  if (roleConfig?.fullAccess) {
    return 'admin'; // Full admin navigation
  }

  // Employee navigation for non-admin roles
  return 'employee';
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Suggest role based on legacy data
 * Used for data migration
 */
export function suggestRoleFromLegacyData(user) {
  if (!user) return ROLES.EMPLOYEE;

  // CEO always CEO role
  if (user.position === 'CEO' || user.role === 'ceo') {
    return ROLES.CEO;
  }

  // Admin departments
  if (ADMIN_DEPARTMENTS.includes(user.department)) {
    return ROLES.ADMIN;
  }

  // Position-based mapping
  if (user.position && LEGACY_POSITION_TO_ROLE[user.position]) {
    return LEGACY_POSITION_TO_ROLE[user.position];
  }

  // Manager role (legacy)
  if (user.role === 'manager') {
    return ROLES.MANAGER;
  }

  // Admin role (legacy)
  if (user.role === 'admin') {
    return ROLES.ADMIN;
  }

  // Default
  return ROLES.EMPLOYEE;
}

/**
 * Check if user needs role migration
 */
export function needsRoleMigration(user) {
  if (!user) return false;
  
  const currentRole = user.role;
  const suggestedRole = suggestRoleFromLegacyData(user);
  
  return currentRole !== suggestedRole;
}