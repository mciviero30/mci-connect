import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { getShiftsForEmployeeDay as getShiftsDualKey } from '@/components/calendario/calendarHelpers';

export default function TimelineView({ 
  currentDate, 
  employees, 
  shifts, 
  onShiftClick,
  onCellClick,
  isAdmin,
  language 
}) {
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm
  
  const toggleEmployee = (employeeId) => {
    const updated = new Set(expandedEmployees);
    if (updated.has(employeeId)) {
      updated.delete(employeeId);
    } else {
      updated.add(employeeId);
    }
    setExpandedEmployees(updated);
  };

  const getShiftsForEmployeeDay = (employee, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return getShiftsDualKey(shifts, employee, dateStr);
  };

  const getShiftPosition = (shift) => {
    if (!shift.start_time || !shift.end_time) return null;
    
    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM - (7 * 60); // Offset from 7am
    const endMinutes = endH * 60 + endM - (7 * 60);
    const duration = endMinutes - startMinutes;
    
    if (startMinutes < 0 || duration <= 0) return null;
    
    return {
      left: `${(startMinutes / (14 * 60)) * 100}%`,
      width: `${(duration / (14 * 60)) * 100}%`
    };
  };

  const getShiftColor = (shift) => {
    if (shift.shift_type === 'time_off') return 'bg-red-500';
    if (shift.shift_type === 'appointment') return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <div className="grid grid-cols-8 gap-2">
            <div className="font-semibold text-slate-700">
              {language === 'es' ? 'Empleado' : 'Employee'}
            </div>
            {weekDays.map(day => (
              <div key={day.toString()} className="text-center">
                <div className="font-semibold text-slate-900">
                  {format(day, 'EEE')}
                </div>
                <div className="text-xs text-slate-500">
                  {format(day, 'MMM d')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Rows */}
      {(employees || []).filter(e => e.employment_status === 'active').map(employee => {
        const employeeKey = employee.id || employee.email;
        const isExpanded = expandedEmployees.has(employeeKey);
        const employeeShifts = shifts.filter(s =>
          (employee.id && s.user_id) ? s.user_id === employee.id : s.employee_email === employee.email
        );
        const weeklyHours = employeeShifts.reduce((sum, s) => {
          if (!s.start_time || !s.end_time) return sum;
          const [startH, startM] = s.start_time.split(':').map(Number);
          const [endH, endM] = s.end_time.split(':').map(Number);
          const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
          return sum + (hours > 0 ? hours : 0);
        }, 0);

        return (
          <Card key={employeeKey} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="grid grid-cols-8 gap-2 items-center">
                {/* Employee Info */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEmployee(employeeKey)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {employee.full_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {weeklyHours.toFixed(1)}h
                    </div>
                  </div>
                </div>

                {/* Day Cells */}
                {weekDays.map(day => {
                  const dayShifts = getShiftsForEmployeeDay(employee, day);
                  
                  return (
                    <div 
                      key={day.toString()} 
                      className="relative h-12 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100"
                      onClick={() => isAdmin && onCellClick(day, '09:00', employee.email || employee.id)}
                    >
                      {/* Compact view */}
                      {!isExpanded && dayShifts.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center gap-1">
                          {dayShifts.map((shift, idx) => (
                            <div
                              key={shift.id || idx}
                              className={`w-2 h-2 rounded-full ${getShiftColor(shift)}`}
                              title={shift.title || shift.job_name}
                            />
                          ))}
                        </div>
                      )}

                      {/* Expanded view - Timeline bars */}
                      {isExpanded && dayShifts.map((shift, idx) => {
                        const position = getShiftPosition(shift);
                        if (!position) return null;

                        return (
                          <div
                            key={shift.id || idx}
                            className={`absolute top-1 h-10 ${getShiftColor(shift)} rounded opacity-90 hover:opacity-100 cursor-pointer shadow-sm`}
                            style={position}
                            onClick={(e) => {
                              e.stopPropagation();
                              onShiftClick(shift);
                            }}
                            title={`${shift.start_time} - ${shift.end_time}\n${shift.title || shift.job_name}`}
                          >
                            <div className="text-[10px] text-white font-semibold px-1 truncate">
                              {shift.start_time?.substring(0, 5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-600 space-y-1">
                    {weekDays.map(day => {
                      const dayShifts = getShiftsForEmployeeDay(employee, day);
                      if (dayShifts.length === 0) return null;

                      return (
                        <div key={day.toString()} className="flex gap-2">
                          <span className="font-semibold w-16">{format(day, 'EEE d')}</span>
                          <div className="flex-1 space-y-1">
                            {dayShifts.map((shift, idx) => (
                              <div key={shift.id || idx} className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{shift.start_time} - {shift.end_time}</span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {shift.job_name || shift.title}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}