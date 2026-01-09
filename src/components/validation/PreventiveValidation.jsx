import React from 'react';
import { AlertCircle, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * PREVENTIVE VALIDATION SYSTEM
 * Bloquea acciones inválidas ANTES de que fallen
 * 
 * Siempre explica POR QUÉ está bloqueado
 */

// Disabled Button with Reason
export const DisabledButton = ({ 
  children, 
  reason, 
  disabled = true,
  onClick,
  className = '',
  variant = 'default',
  ...props 
}) => {
  if (!disabled) {
    return (
      <Button onClick={onClick} className={className} variant={variant} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button 
              disabled 
              className={`${className} cursor-not-allowed`}
              variant={variant}
              {...props}
            >
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top"
          className="bg-slate-900 text-white border-slate-700 max-w-xs"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <p className="text-xs">{reason}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Validation Blocker - Full section disabled
export const ValidationBlocker = ({ 
  blocked, 
  reason, 
  children,
  className = '' 
}) => {
  if (!blocked) return children;

  return (
    <div className={`relative ${className}`}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 max-w-xs text-center shadow-2xl">
          <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-white font-semibold text-sm mb-1">Can't do that yet</p>
          <p className="text-slate-300 text-xs">{reason}</p>
        </div>
      </div>
      
      {/* Blurred content */}
      <div className="opacity-40 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// Context Requirement - Inline warning
export const ContextRequirement = ({ 
  met, 
  requirement,
  action,
  children 
}) => {
  if (met) return children;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {requirement}
          </p>
          {action && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {action}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * VALIDATION RULES - Común en toda la app
 */
export const validationRules = {
  // Project context required
  requiresProject: (jobId) => ({
    valid: !!jobId,
    reason: 'Select a project first',
  }),
  
  // Area/location required
  requiresArea: (area) => ({
    valid: !!area?.trim(),
    reason: 'Choose an area to continue',
  }),
  
  // User permission required
  requiresPermission: (hasPermission) => ({
    valid: hasPermission,
    reason: "You don't have access to this",
  }),
  
  // Job status active
  requiresActiveJob: (job) => ({
    valid: job?.status === 'active',
    reason: 'This job is locked',
  }),
  
  // Online connection required
  requiresOnline: (isOnline) => ({
    valid: isOnline,
    reason: 'Need internet for this action',
  }),
  
  // Form completeness
  requiresCompleteForm: (fields, requiredFields) => {
    const missing = requiredFields.filter(f => !fields[f]);
    return {
      valid: missing.length === 0,
      reason: missing.length > 0 
        ? `${missing.length} required ${missing.length === 1 ? 'field' : 'fields'} missing`
        : '',
    };
  },
};