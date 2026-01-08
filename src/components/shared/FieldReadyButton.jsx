import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FIELD_BUTTON_STYLES } from '@/components/policies/FieldDesignPolicy';

/**
 * Field-Ready Button Component
 * 
 * Optimized for:
 * - Gloved hands (56px minimum)
 * - One-handed use (thumb-friendly)
 * - Direct sunlight (high contrast)
 * - Speed (large touch target, clear label)
 */
export default function FieldReadyButton({ 
  variant = 'primary', // 'primary' | 'secondary' | 'icon' | 'critical'
  children, 
  icon: Icon,
  className,
  ...props 
}) {
  const baseStyles = {
    primary: FIELD_BUTTON_STYLES.primary,
    secondary: FIELD_BUTTON_STYLES.secondary,
    icon: FIELD_BUTTON_STYLES.iconOnly,
    critical: FIELD_BUTTON_STYLES.critical,
  }[variant] || FIELD_BUTTON_STYLES.primary;

  return (
    <Button
      className={cn(baseStyles, className)}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 mr-2 flex-shrink-0" />}
      {children}
    </Button>
  );
}

/**
 * Field-Ready Icon Button (FAB style)
 */
export function FieldIconButton({ icon: Icon, label, className, ...props }) {
  return (
    <button
      className={cn(
        FIELD_BUTTON_STYLES.iconOnly,
        'relative group',
        className
      )}
      aria-label={label}
      {...props}
    >
      <Icon className="w-6 h-6" />
      {label && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {label}
        </span>
      )}
    </button>
  );
}

/**
 * Field-Ready Checkbox (large touch target)
 */
export function FieldCheckbox({ checked, onChange, label, className }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border-2 transition-all active:scale-95',
        checked 
          ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] border-[#507DB4] shadow-md' 
          : 'bg-white dark:bg-slate-800 border-slate-700 dark:border-slate-300',
        className
      )}
      aria-label={label}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

/**
 * Field-Ready Status Badge (high contrast)
 */
export function FieldStatusBadge({ status, children, className }) {
  const statusStyles = {
    active: 'bg-blue-600 text-white',
    pending: 'bg-amber-600 text-white',
    completed: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    default: 'bg-slate-700 text-white',
  }[status] || 'bg-slate-700 text-white';

  return (
    <span className={cn(
      'px-3 py-1.5 rounded-full font-semibold text-xs shadow-md inline-flex items-center gap-1',
      statusStyles,
      className
    )}>
      {children}
    </span>
  );
}