import React from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { User, Briefcase, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const SHIFT_COLORS = {
  job_work: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300',
  appointment: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300',
  time_off: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300',
};

export default function ResourceView({ 
  currentDate, 
  employees, 
  shifts,
  onShiftClick,
  onCellClick,
  isAdmin,
  language = 'en'
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const activeEmployees = employees.filter(e => e.employment_status === 'active');

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const getShiftsForCell = (employeeIdentifier, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // employeeIdentifier can be user_id or email
    return shifts.filter(s => {
      const matchesEmployee = s.user_id ? s.user_id === employeeIdentifier : s.employee_email === employeeIdentifier;
      return matchesEmployee && s.date === dateStr;
    });
  };

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const getTotalHours = (employeeIdentifier) => {
    return weekDays.reduce((total, day) => {
      const dayShifts = getShiftsForCell(employeeIdentifier, day);
      return total + dayShifts.reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum;
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time.split(':').map(Number);
        return sum + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
      }, 0);
    }, 0);
  };

  return (
    <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 overflow-hidden">
      <ScrollArea className="h-[600px]">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)_80px] border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
            <div className="p-3 font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {language === 'es' ? 'Empleado' : 'Employee'}
              </div>
            </div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 text-center border-r border-slate-200 dark:border-slate-700 ${
                  isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-sm font-semibold ${
                  isSameDay(day, new Date()) 
                    ? 'text-[#3B9FF3]' 
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
            <div className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 mx-auto" />
            </div>
          </div>

          {/* Rows */}
          {activeEmployees.map(employee => {
            // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
            const employeeIdentifier = employee.id || employee.email;
            
            return (
            <div
              key={employee.id || employee.email}
              className="grid grid-cols-[200px_repeat(7,1fr)_80px] border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
            >
              {/* Employee info */}
              <div className="p-3 border-r border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">
                      {employee.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                      {employee.full_name || employee.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {employee.position || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Day cells */}
              {weekDays.map((day, idx) => {
                const cellShifts = getShiftsForCell(employeeIdentifier, day);
                const dateStr = format(day, 'yyyy-MM-dd');

                return (
                  <div
                    key={idx}
                    onClick={() => isAdmin && onCellClick?.(dateStr, null, employee.email)}
                    className={`p-1 border-r border-slate-200 dark:border-slate-700 min-h-[60px] ${
                      isAdmin ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''
                    } ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="space-y-1">
                      {cellShifts.slice(0, 2).map(shift => (
                        <div
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onShiftClick(shift);
                          }}
                          className={`p-1 rounded text-xs border cursor-pointer truncate ${SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.appointment}`}
                        >
                          <span className="font-medium">{shift.start_time}</span>
                          {shift.job_name && (
                            <span className="ml-1 opacity-75">{shift.job_name}</span>
                          )}
                        </div>
                      ))}
                      {cellShifts.length > 2 && (
                        <Badge variant="outline" className="text-xs h-5">
                          +{cellShifts.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Total hours */}
              <div className="p-3 text-center">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {getTotalHours(employeeIdentifier).toFixed(1)}h
                </span>
              </div>
            </div>
          );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}