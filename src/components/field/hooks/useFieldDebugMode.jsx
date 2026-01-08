import { useMemo } from 'react';

/**
 * Determines if Field Debug Mode is active
 * Debug mode shows monitoring panels, stress tests, and data validation tools
 * 
 * Enabled when:
 * - User is admin
 * - URL has ?debug=true
 */
export function useFieldDebugMode(user) {
  return useMemo(() => {
    // Admin always has debug access
    if (user?.role === 'admin') return true;
    
    // Check URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }, [user?.role]);
}

/**
 * Panel visibility configuration
 * Separates production work tools from debug/monitoring tools
 */
export const FIELD_PANELS = {
  // PRODUCTION WORK TOOLS - Always visible
  work: [
    'overview',
    'tasks',
    'dimensions',
    'photos',
    'before-after',
    'daily-reports',
    'checklists',
    'chat',
    'members',
    'documents',
    'site-notes',
    'approvals',
    'forms',
  ],
  
  // DEBUG/MONITORING TOOLS - Admin/debug mode only
  debug: [
    'intelligence',
    'completeness',
    'ai-quality',
    'package',
    'analytics',
    'activity',
    'reports',
    'budget',
    'materials',
    'voice',
    'ai-assistant',
  ]
};

/**
 * Filter sidebar items based on debug mode
 */
export function filterFieldPanels(allPanels, isDebugMode) {
  return allPanels.filter(panel => {
    // Work panels always visible
    if (FIELD_PANELS.work.includes(panel.id)) return true;
    
    // Debug panels only in debug mode
    if (FIELD_PANELS.debug.includes(panel.id)) return isDebugMode;
    
    // Unknown panels - show in debug mode only
    return isDebugMode;
  });
}