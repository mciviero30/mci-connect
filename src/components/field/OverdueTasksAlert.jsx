import React from 'react';
import { AlertTriangle, Clock, ChevronRight, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function OverdueTasksAlert({ tasks, onTaskClick }) {
  // Filter overdue and urgent tasks
  const now = new Date();
  
  const overdueTasks = tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    return isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  });

  const dueTodayTasks = tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    return isToday(new Date(task.due_date));
  });

  const urgentTasks = tasks.filter(task => 
    task.priority === 'urgent' && task.status !== 'completed'
  );

  const blockedTasks = tasks.filter(task => task.status === 'blocked');

  // Calculate days overdue
  const getDaysOverdue = (dueDate) => {
    return differenceInDays(now, new Date(dueDate));
  };

  if (overdueTasks.length === 0 && dueTodayTasks.length === 0 && urgentTasks.length === 0 && blockedTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Overdue Tasks */}
      <AnimatePresence>
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <span className="font-semibold text-red-400">
                {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-red-500/20 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-slate-900 dark:text-white truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                      {getDaysOverdue(task.due_date)}d overdue
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                  </div>
                </button>
              ))}
              {overdueTasks.length > 3 && (
                <p className="text-xs text-red-500 text-center pt-1">
                  +{overdueTasks.length - 3} more overdue tasks
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Due Today */}
      <AnimatePresence>
        {dueTodayTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <span className="font-semibold text-amber-400">
                {dueTodayTasks.length} Due Today
              </span>
            </div>
            <div className="space-y-2">
              {dueTodayTasks.slice(0, 3).map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-amber-500/20 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-900 dark:text-white truncate">
                      {task.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Urgent + Blocked Row */}
      {(urgentTasks.length > 0 || blockedTasks.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-orange-400 text-sm">
                  {urgentTasks.length} Urgent
                </span>
              </div>
              <div className="space-y-1">
                {urgentTasks.slice(0, 2).map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full text-left text-xs text-slate-300 truncate hover:text-orange-400"
                  >
                    • {task.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Tasks */}
          {blockedTasks.length > 0 && (
            <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-400 text-sm">
                  {blockedTasks.length} Blocked
                </span>
              </div>
              <div className="space-y-1">
                {blockedTasks.slice(0, 2).map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full text-left text-xs text-slate-400 truncate hover:text-white"
                  >
                    • {task.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}