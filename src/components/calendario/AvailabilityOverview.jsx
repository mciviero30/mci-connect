import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Clock, Calendar, ChevronLeft, ChevronRight, AlertTriangle, Check } from 'lucide-react';
import EmployeeAvailabilityManager from './EmployeeAvailabilityManager';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityOverview({ employees, currentDate, isAdmin }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAvailabilityManager, setShowAvailabilityManager] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addDays(currentDate, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch all availability data
  const { data: allAvailability = [] } = useQuery({
    queryKey: ['all-availability'],
    queryFn: () => base44.entities.EmployeeAvailability.list(),
  });

  // Fetch all time off data
  const { data: allTimeOffs = [] } = useQuery({
    queryKey: ['all-timeoffs'],
    queryFn: () => base44.entities.EmployeeTimeOff.filter({ status: 'approved' }),
  });

  const getEmployeeAvailability = (employeeEmail, date) => {
    const dayOfWeek = date.getDay();
    
    // Check weekly availability
    const weeklyAvail = allAvailability.find(
      a => a.employee_email === employeeEmail && a.day_of_week === dayOfWeek
    );
    
    // Check time off
    const timeOff = allTimeOffs.find(t => {
      if (t.employee_email !== employeeEmail) return false;
      const start = parseISO(t.start_date);
      const end = parseISO(t.end_date);
      return isWithinInterval(date, { start, end });
    });
    
    if (timeOff) {
      return { 
        status: 'off', 
        reason: timeOff.reason,
        label: 'Time Off'
      };
    }
    
    if (weeklyAvail && !weeklyAvail.is_available) {
      return { 
        status: 'unavailable', 
        label: 'Not Available' 
      };
    }
    
    if (weeklyAvail) {
      return { 
        status: 'available', 
        start: weeklyAvail.start_time,
        end: weeklyAvail.end_time,
        label: `${weeklyAvail.start_time} - ${weeklyAvail.end_time}`
      };
    }
    
    // Default availability
    return { 
      status: 'available', 
      start: '08:00',
      end: '17:00',
      label: '08:00 - 17:00'
    };
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowAvailabilityManager(true);
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Team Availability
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWeekOffset(w => w - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[140px] text-center">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWeekOffset(w => w + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWeekOffset(0)}
              className="ml-2"
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="p-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400 w-48">
                Employee
              </th>
              {weekDays.map((day, i) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <th 
                    key={i} 
                    className={`p-3 text-center text-sm font-medium ${
                      isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>{DAYS_SHORT[day.getDay()]}</div>
                    <div className="text-lg font-bold">{format(day, 'd')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr 
                key={employee.id} 
                className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="p-3">
                  <button
                    onClick={() => handleEmployeeClick(employee)}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                      {employee.full_name?.[0] || 'U'}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                      {employee.full_name}
                    </span>
                  </button>
                </td>
                {weekDays.map((day, i) => {
                  const avail = getEmployeeAvailability(employee.email, day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <td 
                      key={i} 
                      className={`p-2 text-center ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`
                              mx-auto px-2 py-1 rounded-lg text-xs font-medium cursor-default
                              ${avail.status === 'available' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : avail.status === 'off'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                              }
                            `}>
                              {avail.status === 'available' ? (
                                <span className="flex items-center justify-center gap-1">
                                  <Check className="w-3 h-3" />
                                  {avail.start?.slice(0, 5)}
                                </span>
                              ) : avail.status === 'off' ? (
                                <span>Off</span>
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{avail.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs">
        <span className="text-slate-500">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>
          <span className="text-slate-600 dark:text-slate-400">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30"></div>
          <span className="text-slate-600 dark:text-slate-400">Time Off</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800"></div>
          <span className="text-slate-600 dark:text-slate-400">Not Available</span>
        </div>
      </div>

      {/* Availability Manager Modal */}
      <EmployeeAvailabilityManager
        open={showAvailabilityManager}
        onOpenChange={setShowAvailabilityManager}
        employee={selectedEmployee}
        isAdmin={isAdmin}
      />
    </Card>
  );
}