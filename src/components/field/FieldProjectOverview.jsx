import React from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  MapPin,
  Calendar,
  Users,
  ClipboardList,
  FileCheck,
  FileText,
  Map
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import ProjectProgressBar from './ProjectProgressBar.jsx';
import OverdueTasksAlert from './OverdueTasksAlert.jsx';
import { useWorkUnits } from './hooks/useWorkUnits';
import JobProgress from './JobProgress';

export default function FieldProjectOverview({ job, tasks: legacyTasks, plans, onTaskClick, onOpenDailyReport }) {
  // Use unified WorkUnit hook
  const { workUnits, stats: workUnitStats, isLoading } = useWorkUnits(job?.id);
  
  // Use WorkUnits if available, fallback to legacy tasks
  const tasks = workUnits.length > 0 ? workUnits : (legacyTasks || []);
  // Use workUnitStats if available, otherwise calculate
  const pendingTasks = workUnitStats?.pending ?? tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = workUnitStats?.in_progress ?? tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = workUnitStats?.completed ?? tasks.filter(t => t.status === 'completed').length;
  const blockedTasks = workUnitStats?.blocked ?? tasks.filter(t => t.status === 'blocked').length;

  const stats = [
    { label: 'Pending', value: pendingTasks, icon: Clock, color: 'amber' },
    { label: 'In Progress', value: inProgressTasks, icon: CheckSquare, color: 'blue' },
    { label: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'green' },
    { label: 'Blocked', value: blockedTasks, icon: AlertTriangle, color: 'red' },
  ];

  // Additional WorkUnit type stats
  const typeStats = workUnitStats ? [
    { label: 'Tasks', value: workUnitStats.tasks, icon: CheckSquare },
    { label: 'Checklists', value: workUnitStats.checklists, icon: ClipboardList },
    { label: 'Inspections', value: workUnitStats.inspections, icon: FileCheck },
  ] : null;

  const colorClasses = {
    amber: 'bg-amber-50 dark:from-amber-500/20 dark:to-amber-600/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-50 dark:from-blue-500/20 dark:to-blue-600/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:from-green-500/20 dark:to-green-600/20 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:from-red-500/20 dark:to-red-600/20 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-black">Project Overview</h1>
        </div>
        {onOpenDailyReport && (
          <Button onClick={onOpenDailyReport} className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg min-h-[48px] px-6 rounded-xl w-full sm:w-auto touch-manipulation active:scale-[0.98] transition-transform">
            <FileCheck className="w-5 h-5 mr-2" />
            <span className="font-bold">Daily Report</span>
          </Button>
        )}
      </div>

      {/* Work Progress */}
      <div className="mb-6">
        <JobProgress tasks={tasks} />
      </div>

      {/* Overdue/Urgent Alerts */}
      <div className="mb-6">
        <OverdueTasksAlert tasks={tasks} onTaskClick={onTaskClick} />
      </div>

      {/* Stats - Enhanced visual hierarchy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((stat) => {
          const colorClasses = {
            amber: { bg: 'from-amber-500/10 to-amber-600/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
            blue: { bg: 'from-blue-500/10 to-blue-600/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
            green: { bg: 'from-green-500/10 to-green-600/10', border: 'border-green-500/30', icon: 'text-green-400' },
            red: { bg: 'from-red-500/10 to-red-600/10', border: 'border-red-500/30', icon: 'text-red-400' },
          };
          const colors = colorClasses[stat.color];
          
          return (
            <div 
              key={stat.label}
              className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-6 h-6 ${colors.icon}`} />
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Project Info - Enhanced cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            Project Information
          </h3>
          <div className="space-y-3">
            {job.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Address</p>
                  <p className="text-sm text-white">{job.address}</p>
                </div>
              </div>
            )}
            {(job.start_date_field || job.created_date) && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Start Date</p>
                  <p className="text-sm text-white">
                    {format(new Date(job.start_date_field || job.created_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
            {job.client_name_field && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Client</p>
                  <p className="text-sm text-white">{job.client_name_field}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-orange-400" />
            Plans ({plans.length})
          </h3>
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Map className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No plans uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {plans.slice(0, 4).map((plan) => (
                <div key={plan.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img 
                    src={plan.file_url} 
                    alt={plan.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <p className="absolute bottom-1 left-2 text-xs text-white truncate">
                    {plan.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks - Enhanced with better states */}
      <div className="mt-6 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-orange-400" />
          Recent Tasks
        </h3>
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">No tasks created yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.slice(0, 5).map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-4 bg-slate-800 border-2 border-slate-700 rounded-xl hover:border-[#FFB800] transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full shadow-sm ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'blocked' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  <span className="text-white text-sm font-medium truncate">{task.title}</span>
                </div>
                <Badge className={`flex-shrink-0 text-xs px-2.5 py-1 font-bold ${
                  task.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                  task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                  'bg-slate-500/20 text-slate-400 border-slate-500/40'
                }`}>
                  {task.priority || 'normal'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}