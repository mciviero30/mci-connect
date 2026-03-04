import React from 'react';
import { AlertTriangle, Clock, User, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { detectConflicts as detectConflictsHelper } from '@/components/calendario/calendarHelpers';

// Re-export from SSOT helper for backwards compatibility
export function detectConflicts(shifts, newShift) {
  return detectConflictsHelper(shifts, newShift);
}

export default function ConflictAlert({ 
  conflicts, 
  onDismiss,
  language = 'en'
}) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <div className="flex items-start justify-between w-full">
        <div>
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            {language === 'es' ? 'Conflicto de Horario Detectado' : 'Schedule Conflict Detected'}
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <ul className="mt-2 space-y-1">
              {conflicts.map((conflict, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Clock className="w-3 h-3" />
                  <span>
                    {conflict.title || conflict.job_name || 'Shift'}: {conflict.start_time} - {conflict.end_time}
                  </span>
                  {conflict.employee_name && (
                    <>
                      <User className="w-3 h-3 ml-2" />
                      <span>{conflict.employee_name}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}