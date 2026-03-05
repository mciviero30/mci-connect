import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { format, addDays, isSameDay, isValid } from 'date-fns';
import { Plus, CheckCircle, XCircle, Copy, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export default function WeekView({ currentDate, shifts, onDateClick, onShiftClick, onConfirmShift, onRejectShift, onCopyShift, onPasteShift, copiedShift, isAdmin, currentUser }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  const [draggedShift, setDraggedShift] = useState(null);
  const [touchOverDay, setTouchOverDay] = useState(null);
  const dayRefs = useRef([]);
  
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
    // Priority: custom_color > job color > shift type
    if (shift.custom_color) return shift.custom_color;
    if (shift.color) return shift.color; // Use Job.color directly
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
    if (!currentUser) return false;
    if (shift.user_id && currentUser.id) return shift.user_id === currentUser.id;
    return shift.employee_email === currentUser.email;
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e, shift) => {
    if (!isAdmin) return;
    setDraggedShift(shift);
  };

  const handleTouchMove = (e) => {
    if (!draggedShift) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const dayCell = el?.closest('[data-day-index]');
    if (dayCell) {
      setTouchOverDay(parseInt(dayCell.dataset.dayIndex));
    }
  };

  const handleTouchEnd = (e) => {
    if (!draggedShift || touchOverDay === null) {
      setDraggedShift(null);
      setTouchOverDay(null);
      return;
    }
    const targetDay = days[touchOverDay];
    if (targetDay && onPasteShift) {
      // Reuse paste mechanism: paste draggedShift onto target day
      onPasteShift(targetDay, draggedShift);
    }
    setDraggedShift(null);
    setTouchOverDay(null);
  };

  return (
    <Card className="bg-white shadow-md overflow-hidden border-slate-200/50">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Compact Header */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            {days.map((day, i) => {
              if (!isValid(day)) return null;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={i} className={`p-2 text-center border-l border-slate-200 first:border-l-0 ${isToday ? 'bg-[#1E3A8A]/5' : ''}`}>
                  <div className="text-[10px] font-medium text-slate-600">{format(day, 'EEE')}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-[#1E3A8A]' : 'text-slate-900'}`}>{format(day, 'd')}</div>
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
                  data-day-index={i}
                  className={`border-l border-slate-200 first:border-l-0 p-1 hover:bg-slate-50 transition-colors group relative min-h-[150px] ${isToday ? 'bg-[#1E3A8A]/5' : 'bg-white'} ${touchOverDay === i ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''}`}
                  onDoubleClick={() => isAdmin && onDateClick(day)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
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
                            className={`px-1.5 py-0.5 rounded text-[9px] leading-tight ${isAdmin || myShift ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-all border-l-4 bg-opacity-20 ${draggedShift?.id === shift.id ? 'opacity-50 ring-2 ring-blue-400' : ''} ${
                              color === 'blue' ? 'bg-blue-100 border-blue-600 text-blue-900' :
                              color === 'green' ? 'bg-green-100 border-green-600 text-green-900' :
                              color === 'purple' ? 'bg-purple-100 border-purple-600 text-purple-900' :
                              color === 'orange' ? 'bg-orange-100 border-orange-600 text-orange-900' :
                              color === 'amber' ? 'bg-amber-100 border-amber-600 text-amber-900' :
                              color === 'pink' ? 'bg-pink-100 border-pink-600 text-pink-900' :
                              color === 'cyan' ? 'bg-cyan-100 border-cyan-600 text-cyan-900' :
                              color === 'red' ? 'bg-red-100 border-red-600 text-red-900' :
                              'bg-slate-100 border-slate-600 text-slate-900'
                            } shadow-sm relative group/shift`}
                            onClick={() => (isAdmin || myShift) && onShiftClick(shift)}
                            onTouchStart={(e) => handleTouchStart(e, shift)}
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
                              <Badge className="absolute top-0.5 right-0.5 badge-soft-green text-[7px] px-0.5 py-0">
                                <CheckCircle className="w-2 h-2" />
                              </Badge>
                            )}
                            {shift.status === 'rejected' && (
                              <Badge className="absolute top-0.5 right-0.5 badge-soft-red text-[7px] px-0.5 py-0">
                                <XCircle className="w-2 h-2" />
                              </Badge>
                            )}
                          </div>
                          
                          {isPending && (
                            <div className="flex gap-0.5 mt-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-5 text-[8px] soft-green-bg px-1"
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
                                className="flex-1 h-5 text-[8px] soft-red-bg px-1"
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
                          className="flex-1 p-1 border border-dashed border-slate-300 rounded hover:border-[#1E3A8A] hover:bg-[#1E3A8A]/10 transition-colors flex items-center justify-center text-slate-400 hover:text-[#1E3A8A]"
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