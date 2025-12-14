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
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import ProjectProgressBar from './ProjectProgressBar.jsx';
import OverdueTasksAlert from './OverdueTasksAlert.jsx';
import { useWorkUnits } from './hooks/useWorkUnits';

export default function FieldProjectOverview({ job, tasks: legacyTasks, plans, onTaskClick }) {
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Project Overview</h1>

      {/* Progress Bar */}
      <div className="mb-6">
        <ProjectProgressBar tasks={tasks} />
      </div>

      {/* Overdue/Urgent Alerts */}
      <div className="mb-6">
        <OverdueTasksAlert tasks={tasks} onTaskClick={onTaskClick} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={`dark:bg-gradient-to-br ${colorClasses[stat.color]} border rounded-xl p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Project Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Project Information</h3>
          <div className="space-y-3">
            {job.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                  <p className="text-slate-900 dark:text-white">{job.address}</p>
                </div>
              </div>
            )}
            {(job.start_date_field || job.created_date) && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Start Date</p>
                  <p className="text-slate-900 dark:text-white">
                    {format(new Date(job.start_date_field || job.created_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
            {job.client_name_field && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
                  <p className="text-slate-900 dark:text-white">{job.client_name_field}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Plans ({plans.length})</h3>
          {plans.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No plans uploaded</p>
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

      {/* Recent Tasks */}
      <div className="mt-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recent Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No tasks created</p>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'blocked' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  <span className="text-slate-900 dark:text-white">{task.title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                  task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                  task.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                  'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}