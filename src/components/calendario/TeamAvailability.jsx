import React from 'react';
import { Users, CheckCircle, Clock, XCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';

export default function TeamAvailability({ 
  employees, 
  shifts, 
  currentDate,
  timeOffRequests = [],
  onEmployeeClick,
  language = 'en'
}) {
  const getEmployeeStatus = (employee) => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Check time-off
    const hasTimeOff = timeOffRequests.some(req => 
      req.employee_email === employee.email &&
      req.status === 'approved' &&
      req.start_date <= dateStr &&
      req.end_date >= dateStr
    );
    
    if (hasTimeOff) {
      return { status: 'off', label: language === 'es' ? 'Ausente' : 'Off', color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' };
    }

    // Check shifts for the day
    const dayShifts = shifts.filter(s => 
      s.employee_email === employee.email &&
      s.date === dateStr
    );

    if (dayShifts.length === 0) {
      return { status: 'available', label: language === 'es' ? 'Disponible' : 'Available', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
    }

    // Calculate total hours
    const totalHours = dayShifts.reduce((sum, s) => {
      if (!s.start_time || !s.end_time) return sum;
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      return sum + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    }, 0);

    if (totalHours >= 8) {
      return { status: 'busy', label: language === 'es' ? 'Ocupado' : 'Busy', color: 'text-red-500 bg-red-100 dark:bg-red-900/30', hours: totalHours };
    }

    return { status: 'partial', label: `${totalHours.toFixed(1)}h`, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30', hours: totalHours };
  };

  const sortedEmployees = [...employees]
    .filter(e => e.employment_status === 'active')
    .map(e => ({ ...e, ...getEmployeeStatus(e) }))
    .sort((a, b) => {
      const order = { available: 0, partial: 1, busy: 2, off: 3 };
      return order[a.status] - order[b.status];
    });

  const available = sortedEmployees.filter(e => e.status === 'available').length;
  const busy = sortedEmployees.filter(e => e.status === 'busy' || e.status === 'partial').length;
  const off = sortedEmployees.filter(e => e.status === 'off').length;

  return (
    <Card className="bg-white dark:bg-[#282828] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-sm font-semibold">
          <Users className="w-4 h-4 text-[#3B9FF3]" />
          {language === 'es' ? 'Disponibilidad' : 'Availability'}
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {format(currentDate, 'EEE, MMM d')}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        {/* Summary - more compact */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-0.5">
            <CheckCircle className="w-3 h-3 mr-1" />
            {available}
          </Badge>
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" />
            {busy}
          </Badge>
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs px-2 py-0.5">
            <Calendar className="w-3 h-3 mr-1" />
            {off}
          </Badge>
        </div>

        {/* Employee list - more compact */}
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {sortedEmployees.map(emp => (
              <button
                key={emp.email}
                onClick={() => onEmployeeClick?.(emp)}
                className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">
                    {emp.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white text-xs truncate">
                    {emp.full_name?.split(' ')[0] || emp.email?.split('@')[0]}
                  </p>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 ${emp.color}`}>
                  {emp.label}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}