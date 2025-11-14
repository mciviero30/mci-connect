import React from 'react';
import { Card } from '@/components/ui/card';
import { format, addDays, isSameDay, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WeekView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, isAdmin, currentUser }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const weekStart = new Date(validDate);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

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
    return 'Event';
  };

  const isMyShift = (shift) => {
    return currentUser && shift.employee_email === currentUser.email;
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl overflow-hidden border-slate-200">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            {days.map((day, i) => {
              if (!isValid(day)) return null;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={i} className={`p-4 text-center border-l border-slate-200 first:border-l-0 ${isToday ? 'bg-[#3B9FF3]/10' : ''}`}>
                  <div className="font-semibold text-slate-700">{format(day, 'EEE')}</div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-[#3B9FF3]' : 'text-slate-900'}`}>{format(day, 'd')}</div>
                  <div className="text-xs text-slate-500">{format(day, 'MMM')}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 min-h-[400px]">
            {days.map((day, i) => {
              if (!isValid(day)) return null;

              // GUARDRAIL: Ensure shifts is an array
              const dayShifts = (shifts || []).filter(s => {
                if (!s.date) return false;
                const shiftDate = new Date(s.date);
                return isValid(shiftDate) && isSameDay(shiftDate, day);
              });

              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={i}
                  className={`border-l border-slate-200 first:border-l-0 p-2 hover:bg-blue-50 transition-colors group relative min-h-[200px] ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}
                  onDoubleClick={() => isAdmin && onDateClick(day)}
                >
                  <div className="space-y-2">
                    {dayShifts.map(shift => {
                      const color = getShiftColor(shift);
                      const myShift = isMyShift(shift);
                      const isPending = shift.status === 'scheduled' && myShift;
                      
                      return (
                        <div key={shift.id}>
                          <div
                            className={`p-2 rounded-lg text-xs ${isAdmin || myShift ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity bg-${color}-500 text-white shadow-md relative`}
                            onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                          >
                            <p className="font-semibold truncate">{getEventLabel(shift)}</p>
                            {shift.employee_name && (
                              <p className="text-[10px] opacity-90 truncate">{shift.employee_name}</p>
                            )}
                            {shift.start_time && (
                              <p className="text-[10px] opacity-90">{shift.start_time} - {shift.end_time}</p>
                            )}
                            
                            {/* Status Badge */}
                            {shift.status === 'confirmed' && (
                              <Badge className="absolute top-1 right-1 bg-green-600 text-white text-[8px] px-1 py-0">
                                <CheckCircle className="w-2 h-2" />
                              </Badge>
                            )}
                            {shift.status === 'rejected' && (
                              <Badge className="absolute top-1 right-1 bg-red-600 text-white text-[8px] px-1 py-0">
                                <XCircle className="w-2 h-2" />
                              </Badge>
                            )}
                          </div>
                          
                          {/* Employee Action Buttons */}
                          {isPending && (
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-6 text-[10px] bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfirmShift(shift.id);
                                }}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-6 text-[10px] bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectShift(shift.id);
                                }}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {isAdmin && (
                      <button
                        onClick={() => onDateClick(day)}
                        className="w-full p-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#3B9FF3] hover:bg-[#3B9FF3]/10 transition-colors flex items-center justify-center gap-1 text-slate-400 hover:text-[#3B9FF3] opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}