
import React from 'react';
import { Card } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isValid } from 'date-fns';
import { Plus } from 'lucide-react';

export default function MonthView({ currentDate, assignments, onDateClick, onAssignmentClick, isAdmin }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const monthStart = startOfMonth(validDate);
  const monthEnd = endOfMonth(validDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getJobColor = (assignment) => {
    // Time-off events are always orange/red
    if (assignment.event_type === 'time_off') return 'orange';
    
    // Appointments without job are blue
    if (assignment.event_type === 'appointment' && !assignment.job_id) return 'blue';
    
    // Job milestones and appointments with job use job color
    if (!assignment.job_id) return 'slate'; // Default for other types without job_id
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'red', 'indigo'];
    const hash = assignment.job_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getEventLabel = (assignment) => {
    if (assignment.event_title) return assignment.event_title;
    if (assignment.job_name) return assignment.job_name;
    // For regular assignments (e.g., job assignments), use employee name
    if (assignment.employee_name) return assignment.employee_name;
    return 'Event';
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

            const dayAssignments = assignments.filter(a => {
              if (!a.date) return false;
              const assignmentDate = new Date(a.date);
              return isValid(assignmentDate) && isSameDay(assignmentDate, day);
            });

            const isCurrentMonth = isSameMonth(day, validDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                className={`min-h-[120px] p-2 rounded-lg border transition-colors group relative ${
                  isCurrentMonth ? 'bg-white border-slate-200 hover:bg-blue-50' : 'bg-slate-100/50 border-slate-200'
                } ${isToday ? 'ring-2 ring-[#3B9FF3] bg-blue-50' : ''}`}
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
                  {dayAssignments.slice(0, 3).map(assignment => {
                    const color = getJobColor(assignment);
                    return (
                      <div
                        key={assignment.id}
                        className={`text-[10px] p-1 rounded truncate ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} bg-${color}-500 text-white shadow-sm`}
                        onClick={() => isAdmin && onAssignmentClick(assignment)}
                      >
                        {assignment.start_time} {getEventLabel(assignment).split(' ')[0]}
                      </div>
                    );
                  })}
                  {dayAssignments.length > 3 && (
                    <div className="text-[10px] text-[#3B9FF3] font-semibold pl-1">
                      +{dayAssignments.length - 3} more
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
