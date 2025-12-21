import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Activity,
  CheckSquare,
  Image,
  FileText,
  MessageSquare,
  Users,
  Flag,
  CheckCircle2,
  Upload,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const actionIcons = {
  created: Upload,
  updated: Edit,
  deleted: Trash2,
  completed: CheckCircle2,
  approved: CheckCircle2,
  rejected: Trash2,
  uploaded: Upload,
  commented: MessageSquare,
};

const entityIcons = {
  task: CheckSquare,
  plan: FileText,
  photo: Image,
  document: FileText,
  form: FileText,
  comment: MessageSquare,
  member: Users,
  milestone: Flag,
  approval: CheckCircle2,
};

const actionColors = {
  created: 'text-green-400 bg-green-500/20',
  updated: 'text-blue-400 bg-blue-500/20',
  deleted: 'text-red-400 bg-red-500/20',
  completed: 'text-emerald-400 bg-emerald-500/20',
  approved: 'text-green-400 bg-green-500/20',
  rejected: 'text-red-400 bg-red-500/20',
  uploaded: 'text-amber-400 bg-amber-500/20',
  commented: 'text-purple-400 bg-purple-500/20',
};

export default function FieldActivityLogView({ jobId }) {
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['field-activity-log', jobId],
    queryFn: () => base44.entities.FieldActivityLog.filter({ job_id: jobId }, '-created_date', 100),
  });

  const filteredActivities = activities.filter(activity => {
    const matchesEntity = entityFilter === 'all' || activity.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || activity.action === actionFilter;
    return matchesEntity && matchesAction;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Project Activity
        </h1>
        <div className="flex gap-2">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All</SelectItem>
              <SelectItem value="task" className="text-white">Tasks</SelectItem>
              <SelectItem value="photo" className="text-white">Photos</SelectItem>
              <SelectItem value="document" className="text-white">Documents</SelectItem>
              <SelectItem value="comment" className="text-white">Comments</SelectItem>
              <SelectItem value="milestone" className="text-white">Milestones</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All</SelectItem>
              <SelectItem value="created" className="text-white">Created</SelectItem>
              <SelectItem value="updated" className="text-white">Updated</SelectItem>
              <SelectItem value="completed" className="text-white">Completed</SelectItem>
              <SelectItem value="deleted" className="text-white">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FFB800] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-2xl p-12 text-center shadow-lg">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No activity</h3>
          <p className="text-slate-400">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {format(new Date(date), "EEEE, d MMMM yyyy")}
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="space-y-2">
                {dayActivities.map(activity => {
                  const ActionIcon = actionIcons[activity.action] || Activity;
                  const EntityIcon = entityIcons[activity.entity_type] || FileText;
                  const colorClass = actionColors[activity.action] || 'text-slate-400 bg-slate-500/20';

                  return (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-blue-300 dark:hover:border-slate-600 transition-all"
                    >
                      <div className={`p-2 rounded-lg ${colorClass.split(' ')[1]}`}>
                        <ActionIcon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white">{activity.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <EntityIcon className="w-3 h-3" />
                            <span className="capitalize">{activity.entity_type}</span>
                          </div>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">{activity.user_name}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(activity.created_date), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}