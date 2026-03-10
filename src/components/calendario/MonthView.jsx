import React from 'react';
import { Card } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isMyShift as checkIsMyShift } from '@/components/calendario/calendarHelpers';

export default function MonthView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, isAdmin, currentUser, timeEntries = [] }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const monthStart = startOfMonth(validDate);
  const monthEnd = endOfMonth(validDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getShiftColor = (shift) => {
    if (shift.custom_color) return shift.custom_color;
    if (shift.color) return shift.color;
    if (shift.shift_type === 'time_off') return 'orange';
    if (shift.shift_type === 'appointment') return 'blue';
    return 'slate';
  };

  const getEventLabel = (shift) => {
    if (shift.shift_title) return shift.shift_title;
    if (shift.job_name) return shift.job_name;
    if (shift.employee_name) return shift.employee_name;
    return 'Event';
  };

  const isMyShift = (shift) => checkIsMyShift(shift, currentUser);

  // PASO 2: Attendance indicator
  const getAttendanceStatus = (shift, day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDay = new Date(day);
    shiftDay.setHours(0, 0, 0, 0);
    
    // Today or future: neutral (day not done yet)
    if (shiftDay >= today) return 'future';
    
    // Check if there's a TimeEntry for this user+job+date
    const shiftDate = format(day, 'yyyy-MM-dd');
    const userId = shift.user_id;
    const userEmail = shift.employee_email;
    
    const hasEntry = timeEntries.some(te => 
      te.date === shiftDate &&
      (te.job_id === shift.job_id) &&
      (userId ? te.user_id === userId : te.employee_email === userEmail)
    );
    
    return hasEntry ? 'attended' : 'absent';
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="bg-white shadow-md border-slate-200/50">
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-slate-700 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            if (!isValid(day)) return null;

            // GUARDRAIL: Ensure shifts is an array
            const dayShifts = (shifts || []).filter(s => {
              if (!s.date) return false;
              const shiftDate = new Date(s.date);
              return isValid(shiftDate) && isSameDay(shiftDate, day);
            });

            const isCurrentMonth = isSameMonth(day, validDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                className={`min-h-[120px] p-2 rounded-lg border transition-colors group relative ${
                  isCurrentMonth ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-slate-100/50 border-slate-200'
                } ${isToday ? 'ring-2 ring-[#1E3A8A] bg-[#1E3A8A]/5' : ''}`}
                onDoubleClick={() => isAdmin && isCurrentMonth && onDateClick(day)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-sm font-semibold ${isCurrentMonth ? (isToday ? 'text-[#1E3A8A]' : 'text-slate-900') : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </div>
                  {isAdmin && isCurrentMonth && (
                    <button
                      onClick={() => onDateClick(day)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1E3A8A]/20 rounded"
                    >
                      <Plus className="w-3 h-3 text-[#1E3A8A]" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 3).map(shift => {
                    const color = getShiftColor(shift);
                    const myShift = isMyShift(shift);
                    const isPending = shift.status === 'scheduled' && myShift;
                    
                    return (
                      <div key={shift.id} className="space-y-1">
                        <div
                          className={`text-[10px] p-1 rounded truncate border-l-4 bg-opacity-20 ${isAdmin || myShift ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} ${
                            color === 'blue' ? 'bg-blue-100 border-blue-600 text-blue-900' :
                            color === 'green' ? 'bg-green-100 border-green-600 text-green-900' :
                            color === 'purple' ? 'bg-purple-100 border-purple-600 text-purple-900' :
                            color === 'orange' ? 'bg-orange-100 border-orange-600 text-orange-900' :
                            color === 'amber' ? 'bg-amber-100 border-amber-600 text-amber-900' :
                            color === 'pink' ? 'bg-pink-100 border-pink-600 text-pink-900' :
                            color === 'cyan' ? 'bg-cyan-100 border-cyan-600 text-cyan-900' :
                            color === 'red' ? 'bg-red-100 border-red-600 text-red-900' :
                            'bg-slate-100 border-slate-600 text-slate-900'
                          } shadow-sm relative`}
                          onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                        >
                          {shift.start_time} {getEventLabel(shift).split(' ')[0]}
                          
                          {(() => {
                            const att = getAttendanceStatus(shift, day);
                            if (att === 'attended') return <CheckCircle className="inline w-2 h-2 ml-1 text-green-600" />;
                            if (att === 'absent') return <XCircle className="inline w-2 h-2 ml-1 text-red-500" />;
                            return null;
                          })()}
                        </div>
                        
                        {isPending && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-5 text-[8px] soft-green-bg px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmShift(shift.id);
                              }}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-5 text-[8px] soft-red-bg px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRejectShift(shift.id);
                              }}
                            >
                              ✗
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayShifts.length > 3 && (
                    <div className="text-[10px] text-[#1E3A8A] font-semibold pl-1">
                      +{dayShifts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}