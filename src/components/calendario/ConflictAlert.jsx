import React from 'react';
import { AlertTriangle, Clock, User, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export function detectConflicts(shifts, newShift) {
  if (!newShift.date || !newShift.start_time || !newShift.end_time) return [];

  const [newStartH, newStartM] = newShift.start_time.split(':').map(Number);
  const [newEndH, newEndM] = newShift.end_time.split(':').map(Number);
  const newStart = newStartH * 60 + newStartM;
  const newEnd = newEndH * 60 + newEndM;

  return shifts.filter(shift => {
    if (shift.id === newShift.id) return false;
    if (shift.date !== newShift.date) return false;
    if (newShift.employee_email && shift.employee_email !== newShift.employee_email) return false;
    if (!shift.start_time || !shift.end_time) return false;

    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    // Check overlap
    return (newStart < end && newEnd > start);
  });
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