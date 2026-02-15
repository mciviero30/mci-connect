import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/**
 * Mobile-optimized form components
 * Ensures minimum touch target size (44x44px) and proper spacing
 */

export const MobileInput = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Label>
      )}
      <Input
        ref={ref}
        className="min-h-[48px] text-base bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
});
MobileInput.displayName = 'MobileInput';

export const MobileTextarea = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Label>
      )}
      <Textarea
        ref={ref}
        className="min-h-[120px] text-base bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
});
MobileTextarea.displayName = 'MobileTextarea';

export const FormSection = ({ title, children }) => {
  return (
    <div className="space-y-4 py-4 border-b border-slate-200 dark:border-slate-700 last:border-0">
      {title && (
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export const FormActions = ({ onCancel, onSubmit, isLoading, submitText = 'Save', cancelText = 'Cancel' }) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 sticky bottom-0 bg-white dark:bg-[#282828] pb-safe">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 min-h-[48px] px-6 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
      >
        {cancelText}
      </button>
      <button
        type="submit"
        onClick={onSubmit}
        disabled={isLoading}
        className="flex-1 min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white font-semibold shadow-md disabled:opacity-50 transition-all"
      >
        {isLoading ? 'Saving...' : submitText}
      </button>
    </div>
  );
};