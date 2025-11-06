
import React from 'react';
import { Card } from '@/components/ui/card';
import { format, addDays, isSameDay, isValid } from 'date-fns';
import { Plus } from 'lucide-react';

export default function WeekView({ currentDate, assignments, onDateClick, onAssignmentClick, isAdmin }) {
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

  const getJobColor = (assignment) => {
    // Time-off events are always orange/red
    if (assignment.event_type === 'time_off') return 'orange';
    
    // Appointments without job are blue
    if (assignment.event_type === 'appointment' && !assignment.job_id) return 'blue';
    
    // Job milestones and appointments with job use job color
    if (!assignment.job_id) return 'slate'; // Default if no job_id and not a special event type
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'red', 'indigo'];
    const hash = assignment.job_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getEventLabel = (assignment) => {
    if (assignment.event_title) return assignment.event_title;
    if (assignment.job_name) return assignment.job_name;
    return 'Event';
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

              const dayAssignments = assignments.filter(a => {
                if (!a.date) return false;
                const assignmentDate = new Date(a.date);
                return isValid(assignmentDate) && isSameDay(assignmentDate, day);
              });

              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={i}
                  className={`border-l border-slate-200 first:border-l-0 p-2 hover:bg-blue-50 transition-colors group relative min-h-[200px] ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}
                >
                  <div className="space-y-2">
                    {dayAssignments.map(assignment => {
                      const color = getJobColor(assignment);
                      return (
                        <div
                          key={assignment.id}
                          className={`p-2 rounded-lg text-xs ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity bg-${color}-500 text-white shadow-md`}
                          onClick={() => isAdmin && onAssignmentClick(assignment)}
                        >
                          <p className="font-semibold truncate">{getEventLabel(assignment)}</p>
                          {assignment.employee_name && (
                            <p className="text-[10px] opacity-90 truncate">{assignment.employee_name}</p>
                          )}
                          {assignment.start_time && (
                            <p className="text-[10px] opacity-90">{assignment.start_time} - {assignment.end_time}</p>
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
