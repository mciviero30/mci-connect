/**
 * FIELD-READY DESIGN POLICY
 * 
 * Standards for apps used in real construction environments
 * Optimized for: gloves, one hand, sunlight, speed, poor signal
 */

export const FIELD_STANDARDS = {
  // Touch targets (glove-friendly)
  touchTargets: {
    minimum: 44,        // px - Accessibility minimum
    preferred: 56,      // px - Glove-friendly
    spacing: 8,         // px - Minimum gap between targets
    critical: 64,       // px - For primary actions (Clock In, Complete Task)
  },

  // Text sizes (sunlight-readable)
  textSizes: {
    critical: 18,       // px - Addresses, times, critical info (bold)
    body: 16,           // px - Task titles, descriptions
    labels: 14,         // px - Form labels, secondary info
    badges: 12,         // px - Status indicators (minimum)
    tiny: 11,           // px - Absolute minimum (avoid if possible)
  },

  // Contrast ratios (direct sunlight)
  contrast: {
    textOnWhite: 7.0,   // WCAG AAA (slate-800+)
    textOnColor: 4.5,   // WCAG AA minimum
    uiElements: 4.5,    // Borders, icons
    statusBadges: 7.0,  // Must be solid backgrounds
  },

  // Thumb zones (one-handed use)
  thumbZones: {
    safe: 'bottom 1/3 of screen',      // Easy to reach
    neutral: 'middle 1/3 of screen',   // Reachable with stretch
    dead: 'top 1/3 and corners',       // Impossible one-handed
  },

  // Action speed (for workers in a hurry)
  speedTargets: {
    critical: 1,        // taps - Clock in/out, complete task
    common: 2,          // taps - Add photo, create dimension
    complex: 3,         // taps - Maximum for any action
  },

  // Offline resilience
  offline: {
    queueAll: true,                    // All actions queue offline
    syncIndicator: 'secondary',        // Visible but not intrusive
    warnDataLoss: true,                // Alert if action can't be queued
  },
};

/**
 * Field-Ready Button Styles
 */
export const FIELD_BUTTON_STYLES = {
  // Primary action (ONE per screen)
  primary: `
    min-h-[56px] min-w-[56px] 
    px-6 py-3 
    text-base font-semibold 
    bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] 
    hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 
    text-white shadow-lg 
    rounded-xl
    active:scale-95 transition-all
  `,

  // Secondary action
  secondary: `
    min-h-[44px] min-w-[44px]
    px-4 py-2
    text-sm font-medium
    bg-white dark:bg-slate-800
    border-2 border-slate-700 dark:border-slate-300
    text-slate-900 dark:text-white
    rounded-lg shadow-sm
    active:scale-95 transition-all
  `,

  // Icon-only (FAB)
  iconOnly: `
    min-h-[56px] min-w-[56px]
    p-0 flex items-center justify-center
    bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]
    text-white shadow-xl
    rounded-full
    active:scale-90 transition-all
  `,

  // Critical action (extra large)
  critical: `
    min-h-[64px] min-w-[120px]
    px-8 py-4
    text-lg font-bold
    bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]
    text-white shadow-xl
    rounded-2xl
    active:scale-95 transition-all
  `,
};

/**
 * High Contrast Text Styles
 */
export const FIELD_TEXT_STYLES = {
  // Critical information (addresses, times)
  critical: `
    text-lg font-bold 
    text-slate-900 dark:text-white
  `,

  // Body text (descriptions, content)
  body: `
    text-base 
    text-slate-900 dark:text-white
  `,

  // Labels and secondary info
  label: `
    text-sm font-medium 
    text-slate-800 dark:text-slate-200
  `,

  // Status and metadata
  status: `
    text-xs font-semibold 
    text-slate-800 dark:text-slate-200
  `,
};

/**
 * Status Badge Styles (High Contrast)
 */
export const FIELD_STATUS_STYLES = {
  active: 'bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md',
  pending: 'bg-amber-600 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md',
  completed: 'bg-green-600 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md',
  error: 'bg-red-600 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md',
  default: 'bg-slate-700 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-md',
};

/**
 * Thumb Zone Helpers
 */
export const THUMB_ZONES = {
  safe: 'bottom-0 left-0 right-0 h-1/3',      // Bottom 1/3
  neutral: 'top-1/3 bottom-1/3 left-0 right-0', // Middle
  dead: 'top-0 left-0 right-0 h-1/3',         // Top 1/3
};

/**
 * Check if element is in safe thumb zone
 */
export function isInThumbZone(elementY, screenHeight) {
  const bottomThird = screenHeight * (2/3);
  return elementY >= bottomThird;
}

/**
 * Field-Ready Component Checklist
 */
export const FIELD_COMPONENT_CHECKLIST = {
  touchTargets: {
    question: 'Are all interactive elements at least 44px × 44px?',
    critical: true,
  },
  contrast: {
    question: 'Is text contrast at least 7:1 on white backgrounds?',
    critical: true,
  },
  oneHanded: {
    question: 'Can all critical actions be reached with thumb only?',
    critical: true,
  },
  textSize: {
    question: 'Is body text at least 16px?',
    critical: false,
  },
  tapCount: {
    question: 'Are critical actions achievable in ≤2 taps?',
    critical: false,
  },
  offline: {
    question: 'Does the component queue actions when offline?',
    critical: true,
  },
};

/**
 * Apply field-ready standards to existing components
 */
export function applyFieldStandards(component) {
  return {
    // Enforce minimum touch targets
    minHeight: FIELD_STANDARDS.touchTargets.preferred,
    minWidth: FIELD_STANDARDS.touchTargets.preferred,
    
    // Enforce high contrast text
    textColor: 'text-slate-900 dark:text-white',
    
    // Enforce minimum text size
    fontSize: FIELD_STANDARDS.textSizes.body,
    
    // Add touch feedback
    activeScale: 'active:scale-95',
    transition: 'transition-all duration-150',
  };
}