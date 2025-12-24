import React from 'react';
import { Card } from '@/components/ui/card';
import { format, isSameDay, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DayView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, isAdmin, currentUser }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

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
    return 'Event';
  };

  const isMyShift = (shift) => {
    return currentUser && shift.employee_email === currentUser.email;
  };

  // GUARDRAIL: Ensure shifts is an array
  const dayShifts = (shifts || []).filter(s => {
    if (!s.date) return false;
    const shiftDate = new Date(s.date);
    return isValid(shiftDate) && isSameDay(shiftDate, validDate);
  });

  return (
    <Card className="bg-white shadow-md border-slate-200/50">
      <div className="flex flex-col h-[calc(100vh-300px)]">
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px] relative">
            <div className="flex border-b border-slate-200 bg-slate-50">
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center p-2 text-xs text-slate-600 border-l border-slate-200 first:border-l-0">
                  {format(new Date().setHours(hour, 0), 'ha')}
                </div>
              ))}
            </div>

            <div 
              className="relative h-32 border-b border-slate-200 group"
              onDoubleClick={(e) => {
                if (!isAdmin) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const hourFraction = (x / rect.width) * 16;
                const hour = Math.floor(hourFraction + 6);
                const minute = Math.round((hourFraction % 1) * 60 / 15) * 15;
                const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                onDateClick(validDate, timeString);
              }}
            >
              {hours.map(hour => (
                <div key={hour} className="absolute h-full border-l border-slate-200 first:border-l-0" style={{ left: `${((hour - 6) / 16) * 100}%` }} />
              ))}

              {isAdmin && dayShifts.length === 0 && (
                <button
                  onClick={() => onDateClick(validDate)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/50 hover:bg-slate-100/50"
                >
                  <div className="p-2 bg-[#1E3A8A] rounded-full shadow-lg">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              )}

              {dayShifts.map(shift => {
                const [startHour, startMin] = shift.start_time?.split(':').map(Number) || [9, 0];
                const [endHour, endMin] = shift.end_time?.split(':').map(Number) || [17, 0];
                const startPercent = ((startHour + startMin / 60 - 6) / 16) * 100;
                const duration = (endHour + endMin / 60) - (startHour + startMin / 60);
                const widthPercent = (duration / 16) * 100;
                const color = getShiftColor(shift);
                const myShift = isMyShift(shift);
                const isPending = shift.status === 'scheduled' && myShift;

                return (
                  <div key={shift.id}>
                    <div
                      className={`absolute top-1 bottom-1 rounded-lg px-2 py-1 border-l-4 bg-opacity-20 ${isAdmin || myShift ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-all ${
                        color === 'blue' ? 'bg-blue-100 border-blue-600 text-blue-900' :
                        color === 'green' ? 'bg-green-100 border-green-600 text-green-900' :
                        color === 'purple' ? 'bg-purple-100 border-purple-600 text-purple-900' :
                        color === 'orange' ? 'bg-orange-100 border-orange-600 text-orange-900' :
                        color === 'amber' ? 'bg-amber-100 border-amber-600 text-amber-900' :
                        color === 'pink' ? 'bg-pink-100 border-pink-600 text-pink-900' :
                        color === 'cyan' ? 'bg-cyan-100 border-cyan-600 text-cyan-900' :
                        color === 'red' ? 'bg-red-100 border-red-600 text-red-900' :
                        'bg-slate-100 border-slate-600 text-slate-900'
                      } shadow-md overflow-hidden`}
                      style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                      onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                    >
                      <div className="text-xs font-semibold truncate">{getEventLabel(shift)}</div>
                      {shift.employee_name && (
                        <div className="text-[10px] opacity-90 truncate">{shift.employee_name}</div>
                      )}
                      <div className="text-[10px] opacity-90">{shift.start_time}</div>
                      
                      {shift.status === 'confirmed' && (
                        <Badge className="absolute top-1 right-1 badge-soft-green text-[8px] px-1 py-0">
                          <CheckCircle className="w-2 h-2" />
                        </Badge>
                      )}
                      {shift.status === 'rejected' && (
                        <Badge className="absolute top-1 right-1 badge-soft-red text-[8px] px-1 py-0">
                          <XCircle className="w-2 h-2" />
                        </Badge>
                      )}
                    </div>
                    
                    {isPending && (
                      <div className="absolute flex gap-1" style={{ left: `${startPercent}%`, top: 'calc(100% + 4px)' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] soft-green-bg"
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
                          className="h-6 text-[10px] soft-red-bg"
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
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}