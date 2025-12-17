import React from 'react';
import { Card } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MonthView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, isAdmin, currentUser }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const monthStart = startOfMonth(validDate);
  const monthEnd = endOfMonth(validDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getShiftColor = (shift) => {
    if (shift.shift_type === 'time_off') return 'orange';
    if (shift.shift_type === 'appointment' && !shift.job_id) return 'blue';
    if (!shift.job_id) return 'slate';
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'red', 'indigo'];
    const hash = shift.job_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getEventLabel = (shift) => {
    if (shift.shift_title) return shift.shift_title;
    if (shift.job_name) return shift.job_name;
    if (shift.employee_name) return shift.employee_name;
    return 'Event';
  };

  const isMyShift = (shift) => {
    return currentUser && shift.employee_email === currentUser.email;
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200">
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
                  isCurrentMonth ? 'bg-white border-slate-200 hover:bg-blue-50' : 'bg-slate-100/50 border-slate-200'
                } ${isToday ? 'ring-2 ring-[#3B9FF3] bg-blue-50' : ''}`}
                onDoubleClick={() => isAdmin && isCurrentMonth && onDateClick(day)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-sm font-semibold ${isCurrentMonth ? (isToday ? 'text-[#3B9FF3]' : 'text-slate-900') : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </div>
                  {isAdmin && isCurrentMonth && (
                    <button
                      onClick={() => onDateClick(day)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#3B9FF3]/20 rounded"
                    >
                      <Plus className="w-3 h-3 text-[#3B9FF3]" />
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
                          className={`text-[10px] p-1 rounded truncate ${isAdmin || myShift ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} ${
                            color === 'blue' ? 'soft-blue-gradient' :
                            color === 'green' ? 'soft-green-gradient' :
                            color === 'purple' ? 'soft-purple-gradient' :
                            color === 'orange' ? 'soft-amber-gradient' :
                            color === 'pink' ? 'soft-pink-gradient' :
                            color === 'cyan' ? 'soft-cyan-gradient' :
                            color === 'red' ? 'soft-red-gradient' :
                            'soft-slate-gradient'
                          } shadow-sm relative`}
                          onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                        >
                          {shift.start_time} {getEventLabel(shift).split(' ')[0]}
                          
                          {shift.status === 'confirmed' && (
                            <CheckCircle className="inline w-2 h-2 ml-1" />
                          )}
                          {shift.status === 'rejected' && (
                            <XCircle className="inline w-2 h-2 ml-1" />
                          )}
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
                    <div className="text-[10px] text-[#3B9FF3] font-semibold pl-1">
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