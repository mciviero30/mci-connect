import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ProgressTimeline({ tasks = [] }) {
  // Group tasks by week
  const tasksByWeek = tasks.reduce((acc, task) => {
    const date = new Date(task.created_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart,
        tasks: []
      };
    }
    acc[weekKey].tasks.push(task);
    return acc;
  }, {});

  const weeks = Object.values(tasksByWeek).sort((a, b) => b.weekStart - a.weekStart);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Progress Timeline</h3>
      
      {weeks.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
          
          {weeks.map((week, idx) => {
            const completed = week.tasks.filter(t => t.status === 'completed').length;
            const total = week.tasks.length;
            const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={idx} className="relative pl-12 pb-8 last:pb-0">
                {/* Week marker */}
                <div className="absolute left-0 top-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>

                {/* Week card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Week of {format(week.weekStart, 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {completed} of {total} tasks completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {percentComplete}%
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentComplete}%` }}
                    />
                  </div>

                  {/* Tasks summary */}
                  <div className="space-y-1.5">
                    {week.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          {task.title}
                        </span>
                      </div>
                    ))}
                    {week.tasks.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                        +{week.tasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}