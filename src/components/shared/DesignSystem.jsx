/**
 * MCI Connect Design System
 * Unified components and constants for consistent UI
 */

export const SPACING = {
  xs: 'gap-2 p-2',
  sm: 'gap-3 p-3',
  md: 'gap-4 p-4',
  lg: 'gap-6 p-6',
  xl: 'gap-8 p-8'
};

export const SHADOWS = {
  sm: 'shadow-enterprise-sm',
  md: 'shadow-enterprise-md',
  lg: 'shadow-enterprise-lg',
  xl: 'shadow-enterprise-xl'
};

export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl'
};

export const COLORS = {
  primary: {
    gradient: 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]',
    hover: 'hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90',
    text: 'text-[#507DB4] dark:text-[#6B9DD8]',
    bg: 'bg-[#507DB4]'
  },
  success: {
    gradient: 'soft-green-gradient',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800'
  },
  error: {
    gradient: 'soft-red-gradient',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800'
  },
  warning: {
    gradient: 'soft-amber-gradient',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  info: {
    gradient: 'soft-blue-gradient',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  }
};

export const BUTTON_SIZES = {
  sm: 'min-h-[40px] px-3 text-sm',
  md: 'min-h-[44px] px-4 text-sm sm:text-base',
  lg: 'min-h-[48px] px-6 text-base'
};

export const INPUT_CLASSES = 'min-h-[48px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#507DB4] transition-all';

export const CARD_CLASSES = 'bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 rounded-xl shadow-enterprise-md';

export const BADGE_CLASSES = {
  default: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
  status: {
    active: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    completed: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    cancelled: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    draft: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700'
  }
};