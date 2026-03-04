import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getShiftsForEmployeeDay } from '@/components/calendario/calendarHelpers';

export default function ConflictResolver({ 
  shifts, 
  employees,
  onResolveConflict,
  language 
}) {
  // Detect conflicts
  const conflicts = [];
  
  shifts.forEach((shift, idx) => {
    if (!shift.date || !shift.start_time || !shift.end_time) return;
    
    // Check for overlapping shifts for same employee (dual-key)
    const overlapping = shifts.filter((s, i) => {
      if (i === idx) return false;
      if (s.date !== shift.date) return false;
      if (!s.start_time || !s.end_time) return false;
      // Dual-key match
      const sameEmployee = (shift.user_id && s.user_id)
        ? shift.user_id === s.user_id
        : shift.employee_email && shift.employee_email === s.employee_email;
      if (!sameEmployee) return false;
      return !(s.end_time <= shift.start_time || s.start_time >= shift.end_time);
    });

    if (overlapping.length > 0) {
      conflicts.push({
        shift,
        overlapping,
        type: 'overlap'
      });
    }

    // Check for excessive hours (>12h in a day)
    if (shift.start_time && shift.end_time) {
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      
      if (hours > 12) {
        conflicts.push({
          shift,
          type: 'excessive_hours',
          hours
        });
      }
    }
  });

  // Remove duplicates
  const uniqueConflicts = conflicts.filter((c, idx) => 
    conflicts.findIndex(x => x.shift.id === c.shift.id && x.type === c.type) === idx
  );

  if (uniqueConflicts.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <div className="font-semibold text-green-900">
            {language === 'es' ? '✅ Sin Conflictos' : '✅ No Conflicts'}
          </div>
          <div className="text-sm text-green-700">
            {language === 'es' 
              ? 'Todos los turnos están correctamente asignados'
              : 'All shifts are properly assigned'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEmployee = (shift) => {
    if (shift.user_id) return employees.find(e => e.id === shift.user_id);
    return employees.find(e => e.email === shift.employee_email);
  };

  return (
    <Card className="bg-white border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5" />
          {language === 'es' ? `${uniqueConflicts.length} Conflictos Detectados` : `${uniqueConflicts.length} Conflicts Detected`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {uniqueConflicts.map((conflict, idx) => {
            const employee = getEmployee(conflict.shift);
            
            return (
              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 mb-1">
                      {employee?.full_name || conflict.shift.employee_email}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-red-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {conflict.shift.date && format(new Date(conflict.shift.date), 'MMM d, yyyy')}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {conflict.shift.start_time} - {conflict.shift.end_time}
                      </div>
                    </div>
                  </div>

                  <Badge variant="destructive" className="text-xs">
                    {conflict.type === 'overlap' 
                      ? (language === 'es' ? 'Solapamiento' : 'Overlap')
                      : (language === 'es' ? 'Horas Excesivas' : 'Excessive Hours')}
                  </Badge>
                </div>

                {conflict.type === 'overlap' && (
                  <div className="text-xs text-red-600 mt-2 space-y-1">
                    <div className="font-semibold">
                      {language === 'es' ? 'Conflictos con:' : 'Conflicts with:'}
                    </div>
                    {conflict.overlapping.map((s, i) => (
                      <div key={i} className="ml-2">
                        • {s.start_time} - {s.end_time}: {s.job_name || s.title}
                      </div>
                    ))}
                  </div>
                )}

                {conflict.type === 'excessive_hours' && (
                  <div className="text-xs text-red-600 mt-2">
                    {language === 'es' 
                      ? `⚠️ Turno de ${conflict.hours.toFixed(1)} horas excede el límite de 12h`
                      : `⚠️ ${conflict.hours.toFixed(1)}h shift exceeds 12h limit`}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onResolveConflict(conflict.shift)}
                  >
                    {language === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600"
                    onClick={() => onResolveConflict(conflict.shift, 'delete')}
                  >
                    {language === 'es' ? 'Eliminar' : 'Delete'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}