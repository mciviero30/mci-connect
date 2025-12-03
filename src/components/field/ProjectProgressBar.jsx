import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectProgressBar({ tasks, showDetails = true }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const blockedPercent = total > 0 ? (blocked / total) * 100 : 0;

  // Calculate health score (0-100)
  const healthScore = total > 0 
    ? Math.round(((completed * 1) + (inProgress * 0.5) + (pending * 0.25)) / total * 100)
    : 0;

  const getHealthColor = (score) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthLabel = (score) => {
    if (score >= 70) return 'On Track';
    if (score >= 40) return 'Needs Attention';
    return 'At Risk';
  };

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
        <div className="text-center py-4">
          <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No tasks yet to track progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Project Progress</h3>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getHealthColor(healthScore)}`}>
            {Math.round(completedPercent)}%
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            healthScore >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
            healthScore >= 40 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
            'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {getHealthLabel(healthScore)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completedPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${inProgressPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
          style={{ left: `${completedPercent}%` }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${blockedPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="absolute top-0 h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
          style={{ left: `${completedPercent + inProgressPercent}%` }}
        />
      </div>

      {/* Legend */}
      {showDetails && (
        <div className="grid grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{completed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{inProgress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{pending}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Blocked</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{blocked}</p>
            </div>
          </div>
        </div>
      )}

      {/* Task completion rate */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {completed} of {total} tasks completed
          </span>
          {blocked > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-3 h-3" />
              {blocked} blocked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}