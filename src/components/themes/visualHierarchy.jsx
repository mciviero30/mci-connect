/**
 * GLOBAL VISUAL HIERARCHY SYSTEM
 * 
 * Reduces visual fatigue by establishing clear priority levels
 * Ensures only ONE dominant element per screen
 * 
 * Hierarchy Levels:
 * 1. PRIMARY - Main action (one per screen max)
 * 2. SECONDARY - Information display
 * 3. TERTIARY - Status indicators
 * 4. DEBUG - Hidden by default (uses UIVisibilityPolicy)
 */

export const VISUAL_HIERARCHY = {
  // PRIMARY - Dominant, action-driving elements
  primary: {
    purpose: 'Main call-to-action, primary focus',
    usage: 'ONE per screen maximum',
    examples: ['Create Job', 'Submit Quote', 'Clock In', 'Save Changes'],
    colors: {
      light: 'from-[#507DB4] to-[#6B9DD8]', // MCI Blue gradient
      dark: 'from-[#6B9DD8] to-[#507DB4]',
    },
    css: 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-lg font-semibold',
    size: 'Large button, prominent placement, clear label',
    rules: [
      'Never more than ONE primary action visible at once',
      'Always above the fold on mobile',
      'Must be immediately obvious what it does',
    ],
  },

  // SECONDARY - Information and support
  secondary: {
    purpose: 'Display information, secondary actions',
    usage: 'Supporting content, cards, lists',
    examples: ['Data cards', 'Job lists', 'Secondary buttons', 'Navigation'],
    colors: {
      light: 'bg-white border-slate-200',
      dark: 'bg-slate-800 border-slate-700',
    },
    css: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm',
    size: 'Standard size, consistent spacing',
    rules: [
      'Should not compete with primary action',
      'Use subtle colors and borders',
      'Group related items for clarity',
    ],
  },

  // TERTIARY - Status and metadata
  tertiary: {
    purpose: 'Status indicators, badges, timestamps',
    usage: 'Passive information, non-critical',
    examples: ['Status badges', 'Timestamps', 'Read receipts', 'Tooltips'],
    colors: {
      light: 'bg-slate-100 text-slate-600',
      dark: 'bg-slate-900 text-slate-400',
    },
    css: 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs',
    size: 'Small, minimal visual weight',
    rules: [
      'Should blend into the background',
      'Only visible when needed',
      'Never use bright colors unless critical alert',
    ],
  },

  // DEBUG - Technical monitoring (hidden by default)
  debug: {
    purpose: 'Technical monitoring, dev tools',
    usage: 'Only visible with ?debug=true or admin',
    examples: ['Performance monitors', 'Query inspectors', 'Validation panels'],
    colors: {
      light: 'bg-yellow-50 border-yellow-400',
      dark: 'bg-yellow-900/20 border-yellow-600',
    },
    css: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 text-xs',
    size: 'Compact, non-intrusive when visible',
    rules: [
      'NEVER visible to regular users',
      'Use UIVisibilityPolicy wrappers',
      'Should not compete visually with production UI',
    ],
  },
};

/**
 * Alert Color Rules - ONLY for real alerts
 */
export const ALERT_COLORS = {
  critical: {
    when: 'System failure, data loss risk, immediate action required',
    css: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-200',
    examples: ['Server down', 'Payment failed', 'Data not saved'],
  },
  warning: {
    when: 'Potential issue, requires attention soon',
    css: 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-900 dark:text-amber-200',
    examples: ['Expiring certification', 'Low inventory', 'Pending approval'],
  },
  success: {
    when: 'Positive confirmation, completed action',
    css: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-200',
    examples: ['Save successful', 'Payment received', 'Task completed'],
  },
  info: {
    when: 'Neutral information, no action required',
    css: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-200',
    examples: ['New feature available', 'Scheduled maintenance', 'Tip'],
  },
};

/**
 * Visual Weight Scale (1-5)
 * 5 = Most dominant (primary action)
 * 1 = Least dominant (tertiary status)
 */
export const VISUAL_WEIGHT = {
  5: 'primary-action',    // Main CTA
  4: 'secondary-action',  // Secondary buttons
  3: 'content-card',      // Information cards
  2: 'metadata',          // Timestamps, labels
  1: 'status-indicator',  // Passive badges
  0: 'debug-only',        // Hidden by default
};

/**
 * Get CSS classes for hierarchy level
 */
export function getHierarchyClasses(level) {
  return VISUAL_HIERARCHY[level]?.css || '';
}

/**
 * Validate screen composition
 * Ensures only ONE primary element exists
 */
export function validateScreenComposition(elements) {
  const primaryCount = elements.filter(e => e.hierarchy === 'primary').length;
  
  if (primaryCount > 1) {
    return false;
  }
  
  return true;
}