import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function WorkloadHeatmap({ assignments, timeEntries, dateRange, language }) {
  // Get last 8 weeks
  const end = endOfWeek(dateRange.end, { weekStartsOn: 1 });
  const start = startOfWeek(addWeeks(end, -7), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  // Group days by week
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getWorkload = (day) => {
    const dayAssignments = assignments.filter(a => {
      if (!a.date) return false;
      return isSameDay(new Date(a.date), day);
    });

    const dayTimeEntries = timeEntries.filter(e => {
      if (!e.date) return false;
      return isSameDay(new Date(e.date), day);
    });

    const eventCount = dayAssignments.length;
    const hours = dayTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

    // Calculate intensity: events + hours/8 (normalize hours to event scale)
    const intensity = eventCount + (hours / 8);

    return { eventCount, hours, intensity };
  };

  const getColorClass = (intensity) => {
    if (intensity === 0) return 'bg-slate-100 border-slate-200';
    if (intensity < 2) return 'bg-blue-200 border-blue-300';
    if (intensity < 4) return 'bg-blue-400 border-blue-500';
    if (intensity < 6) return 'bg-blue-600 border-blue-700';
    return 'bg-blue-800 border-blue-900';
  };

  return (
    <Card className="bg-white shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#3B9FF3]" />
          {language === 'es' ? 'Mapa de Carga de Trabajo (8 Semanas)' : 'Workload Heatmap (8 Weeks)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-600">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIdx) => {
                  const { eventCount, hours, intensity } = getWorkload(day);
                  const colorClass = getColorClass(intensity);

                  return (
                    <div
                      key={dayIdx}
                      className={`aspect-square rounded-lg border-2 ${colorClass} transition-all hover:scale-110 cursor-pointer group relative`}
                      title={`${format(day, 'MMM d')}\n${eventCount} events\n${hours.toFixed(1)}h`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/80 rounded-lg transition-opacity">
                        <div className="text-white text-center text-xs p-1">
                          <div className="font-bold">{format(day, 'd')}</div>
                          <div>{eventCount} {language === 'es' ? 'ev' : 'ev'}</div>
                          <div>{hours.toFixed(0)}h</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600">{language === 'es' ? 'Menos carga' : 'Less busy'}:</span>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-slate-100 border-2 border-slate-200"></div>
              <div className="w-6 h-6 rounded bg-blue-200 border-2 border-blue-300"></div>
              <div className="w-6 h-6 rounded bg-blue-400 border-2 border-blue-500"></div>
              <div className="w-6 h-6 rounded bg-blue-600 border-2 border-blue-700"></div>
              <div className="w-6 h-6 rounded bg-blue-800 border-2 border-blue-900"></div>
            </div>
            <span className="text-sm text-slate-600">: {language === 'es' ? 'Más carga' : 'More busy'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}