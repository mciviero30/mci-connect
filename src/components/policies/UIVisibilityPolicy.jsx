/**
 * GLOBAL UI VISIBILITY POLICY
 * 
 * Prevents "laboratory mode" from appearing to end users
 * Ensures clean, professional UI for production
 * 
 * Component Classification:
 * - PRODUCTION: Always visible, clean, user-facing
 * - DEBUG: Only visible in debug mode (?debug=true or admin)
 * - ADMIN_ONLY: Only visible to role === 'admin'
 */

export const UI_VISIBILITY_LEVELS = {
  PRODUCTION: 'production',
  DEBUG: 'debug',
  ADMIN_ONLY: 'admin',
};

/**
 * Component Registry - Classify all UI components
 */
export const UI_COMPONENT_REGISTRY = {
  // PRODUCTION UI - Clean, user-facing
  production: [
    'Dashboard',
    'Tasks',
    'Jobs',
    'Employees',
    'Quotes',
    'Invoices',
    'Expenses',
    'TimeTracking',
    'Calendar',
    'Chat',
    'Profile',
    'Field (Work Mode)',
    'Quick Actions',
    'Stats Cards',
    'Job Cards',
    'Task Lists',
    'Photo Galleries',
    'Checklists',
  ],

  // DEBUG UI - Monitoring, testing, validation
  debug: [
    'Field Lifecycle Monitor',
    'Field Data Loss Validator',
    'Field Stress Test',
    'Offline Sync Validator',
    'Performance Monitor',
    'AI Quality Panel',
    'Measurement Intelligence',
    'Completeness Panel',
    'System Health Monitor',
    'Audit Trail (detailed)',
    'Query Cache Inspector',
    'Mutation Queue Viewer',
  ],

  // ADMIN ONLY UI - Sensitive operations
  adminOnly: [
    'Executive Dashboard',
    'Control Tower',
    'System Readiness',
    'Bank Sync',
    'Payroll Auto-Flow',
    'Commission Review',
    'Approval Hub',
    'Role Management',
    'Employee Delete',
    'Codebase Export',
    'Database Operations',
    'Compliance Hub (full)',
  ],
};

/**
 * Check if user can see a UI level
 */
export function canSeeUILevel(user, level) {
  // Production UI - always visible
  if (level === UI_VISIBILITY_LEVELS.PRODUCTION) {
    return true;
  }

  // Admin-only UI
  if (level === UI_VISIBILITY_LEVELS.ADMIN_ONLY) {
    return user?.role === 'admin';
  }

  // Debug UI - admin or ?debug=true
  if (level === UI_VISIBILITY_LEVELS.DEBUG) {
    if (user?.role === 'admin') return true;
    
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }

  return false;
}

/**
 * Get visibility rules for specific contexts
 */
export const VISIBILITY_RULES = {
  // Dashboard widgets
  dashboard: {
    production: ['stats', 'quick-actions', 'recent-activity', 'recognitions'],
    debug: ['query-inspector', 'cache-viewer'],
    adminOnly: ['system-health', 'audit-summary'],
  },

  // Field Mode
  field: {
    production: ['overview', 'tasks', 'dimensions', 'photos', 'checklists', 'chat'],
    debug: ['intelligence', 'completeness', 'ai-quality', 'lifecycle', 'stress-test'],
    adminOnly: ['analytics', 'budget', 'reports'],
  },

  // Finance
  finance: {
    production: ['transaction-list', 'expense-form', 'invoice-view'],
    debug: ['ai-categorizer', 'reconciliation-engine'],
    adminOnly: ['bank-sync', 'cash-flow', 'forecasting'],
  },

  // Admin
  admin: {
    production: [],
    debug: ['system-logs', 'performance-metrics'],
    adminOnly: ['control-tower', 'role-management', 'audit-trail', 'codebase-export'],
  },
};