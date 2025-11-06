
import React from 'react';
import { Card } from '@/components/ui/card';
import { format, isSameDay, isValid } from 'date-fns';
import { Plus } from 'lucide-react';

export default function DayView({ currentDate, assignments, onDateClick, onAssignmentClick, isAdmin }) {
  const validDate = isValid(new Date(currentDate)) ? new Date(currentDate) : new Date();
  
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  const getJobColor = (assignment) => {
    // Time-off events are always orange/red
    if (assignment.event_type === 'time_off') return 'orange';
    
    // Appointments without job are blue
    if (assignment.event_type === 'appointment' && !assignment.job_id) return 'blue';
    
    // Job milestones and appointments with job use job color
    if (!assignment.job_id) return 'slate';
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'red', 'indigo'];
    const hash = assignment.job_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getEventLabel = (assignment) => {
    if (assignment.event_title) return assignment.event_title;
    if (assignment.job_name) return assignment.job_name;
    return 'Event';
  };

  const dayAssignments = assignments.filter(a => {
    if (!a.date) return false;
    const assignmentDate = new Date(a.date);
    return isValid(assignmentDate) && isSameDay(assignmentDate, validDate);
  });

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200">
      <div className="flex h-[calc(100vh-300px)]">
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px] relative">
            <div className="flex border-b border-slate-200 bg-slate-50">
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center p-2 text-xs text-slate-600 border-l border-slate-200 first:border-l-0">
                  {format(new Date().setHours(hour, 0), 'ha')}
                </div>
              ))}
            </div>

            <div className="relative h-32 border-b border-slate-200 group">
              {hours.map(hour => (
                <div key={hour} className="absolute h-full border-l border-slate-200 first:border-l-0" style={{ left: `${((hour - 6) / 16) * 100}%` }} />
              ))}

              {isAdmin && dayAssignments.length === 0 && (
                <button
                  onClick={() => onDateClick(validDate)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/50 hover:bg-blue-50"
                >
                  <div className="p-2 bg-[#3B9FF3] rounded-full shadow-lg">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              )}

              {dayAssignments.map(assignment => {
                const [startHour, startMin] = assignment.start_time?.split(':').map(Number) || [9, 0];
                const [endHour, endMin] = assignment.end_time?.split(':').map(Number) || [17, 0];
                const startPercent = ((startHour + startMin / 60 - 6) / 16) * 100;
                const duration = (endHour + endMin / 60) - (startHour + startMin / 60);
                const widthPercent = (duration / 16) * 100;
                const color = getJobColor(assignment);

                return (
                  <div
                    key={assignment.id}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 py-1 ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity bg-${color}-500 text-white shadow-lg overflow-hidden`}
                    style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                    onClick={() => isAdmin && onAssignmentClick(assignment)}
                  >
                    <div className="text-xs font-semibold truncate">{getEventLabel(assignment)}</div>
                    {assignment.employee_name && (
                      <div className="text-[10px] opacity-90 truncate">{assignment.employee_name}</div>
                    )}
                    <div className="text-[10px] opacity-90">{assignment.start_time}</div>
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
