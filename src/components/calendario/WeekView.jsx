import React from 'react';
import { Card } from '@/components/ui/card';
import { format, addDays, isSameDay, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle, Copy, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WeekView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, onCopyShift, onPasteShift, copiedShift, isAdmin, currentUser }) {
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
    <Card className="bg-white/90 backdrop-blur-sm shadow-lg overflow-hidden border-slate-200">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Compact Header */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            {days.map((day, i) => {
              if (!isValid(day)) return null;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={i} className={`p-2 text-center border-l border-slate-200 first:border-l-0 ${isToday ? 'bg-[#3B9FF3]/10' : ''}`}>
                  <div className="text-[10px] font-medium text-slate-600">{format(day, 'EEE')}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-[#3B9FF3]' : 'text-slate-900'}`}>{format(day, 'd')}</div>
                  <div className="text-[9px] text-slate-500">{format(day, 'MMM')}</div>
                </div>
              );
            })}
          </div>

          {/* Calendar Grid - Shifts in horizontal line */}
          <div className="grid grid-cols-7 min-h-[350px]">
            {days.map((day, i) => {
              if (!isValid(day)) return null;

              const dayShifts = (shifts || []).filter(s => {
                if (!s.date) return false;
                const shiftDate = new Date(s.date);
                return isValid(shiftDate) && isSameDay(shiftDate, day);
              });

              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={i}
                  className={`border-l border-slate-200 first:border-l-0 p-1 hover:bg-blue-50 transition-colors group relative min-h-[150px] ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}
                  onDoubleClick={() => isAdmin && onDateClick(day)}
                >
                  {/* Horizontal layout for shifts */}
                  <div className="flex flex-wrap gap-0.5">
                    {dayShifts.map(shift => {
                      const color = getShiftColor(shift);
                      const myShift = isMyShift(shift);
                      const isPending = shift.status === 'scheduled' && myShift;
                      
                      return (
                        <div key={shift.id} className="w-full">
                          <div
                            className={`px-1.5 py-0.5 rounded text-[9px] leading-tight ${isAdmin || myShift ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity bg-${color}-500 text-white shadow-sm relative group/shift`}
                            onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                          >
                            {isAdmin && onCopyShift && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyShift(shift);
                                }}
                                className="absolute top-0.5 left-0.5 p-0.5 bg-white/20 rounded opacity-0 group-hover/shift:opacity-100 transition-opacity hover:bg-white/40"
                                title="Copy shift"
                              >
                                <Copy className="w-2 h-2" />
                              </button>
                            )}
                            <p className="font-semibold truncate text-[9px]">{getEventLabel(shift)}</p>
                            {shift.employee_name && (
                              <p className="text-[8px] opacity-90 truncate">{shift.employee_name}</p>
                            )}
                            {shift.start_time && (
                              <p className="text-[8px] opacity-90">{shift.start_time}-{shift.end_time}</p>
                            )}
                            
                            {shift.status === 'confirmed' && (
                              <Badge className="absolute top-0.5 right-0.5 bg-green-600 text-white text-[7px] px-0.5 py-0">
                                <CheckCircle className="w-2 h-2" />
                              </Badge>
                            )}
                            {shift.status === 'rejected' && (
                              <Badge className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[7px] px-0.5 py-0">
                                <XCircle className="w-2 h-2" />
                              </Badge>
                            )}
                          </div>
                          
                          {isPending && (
                            <div className="flex gap-0.5 mt-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-5 text-[8px] bg-green-50 border-green-300 text-green-700 hover:bg-green-100 px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfirmShift(shift.id);
                                }}
                              >
                                <CheckCircle className="w-2 h-2 mr-0.5" />
                                OK
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-5 text-[8px] bg-red-50 border-red-300 text-red-700 hover:bg-red-100 px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectShift(shift.id);
                                }}
                              >
                                <XCircle className="w-2 h-2 mr-0.5" />
                                No
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {isAdmin && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 w-full mt-1">
                        <button
                          onClick={() => onDateClick(day)}
                          className="flex-1 p-1 border border-dashed border-slate-300 rounded hover:border-[#3B9FF3] hover:bg-[#3B9FF3]/10 transition-colors flex items-center justify-center text-slate-400 hover:text-[#3B9FF3]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {copiedShift && (
                          <button
                            onClick={() => onPasteShift(day)}
                            className="p-1 border border-dashed border-green-300 rounded hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center text-green-500 hover:text-green-600"
                            title="Paste shift"
                          >
                            <ClipboardPaste className="w-3 h-3" />
                          </button>
                        )}
                      </div>
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