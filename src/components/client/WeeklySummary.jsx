import React from 'react';
import { TrendingUp, CheckCircle2, Camera, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WeeklySummary({ tasks = [], photos = [], activityLog = [] }) {
  // Calculate this week's stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekTasks = tasks.filter(t => {
    const taskDate = new Date(t.created_date);
    return taskDate >= weekStart;
  });

  const thisWeekPhotos = photos.filter(p => {
    const photoDate = new Date(p.created_date);
    return photoDate >= weekStart;
  });

  const completedThisWeek = thisWeekTasks.filter(t => t.status === 'completed').length;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <TrendingUp className="w-5 h-5" />
          This Week's Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Completed</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {completedThisWeek}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {thisWeekTasks.length > 0 ? `of ${thisWeekTasks.length} tasks` : 'tasks'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <Camera className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Photos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {thisWeekPhotos.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">uploaded</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Activity</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {activityLog.filter(a => new Date(a.created_at) >= weekStart).length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">updates</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}