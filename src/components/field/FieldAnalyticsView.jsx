import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Flag,
  FileWarning
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];

export default function FieldAnalyticsView({ jobId, tasks }) {
  // Fetch punch items
  const { data: punchItems = [] } = useQuery({
    queryKey: ['punch-items', jobId],
    queryFn: () => base44.entities.Task.filter({ 
      job_id: jobId,
      task_type: 'punch_item'
    }),
    enabled: !!jobId
  });

  // Fetch activity logs for delays/rework analysis
  const { data: activityLog = [] } = useQuery({
    queryKey: ['activity-analytics', jobId],
    queryFn: () => base44.entities.FieldActivityLog.filter({ job_id: jobId }, '-created_at', 500),
    enabled: !!jobId
  });

  // Calculate stats
  const statusCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  const priorityCounts = {
    low: tasks.filter(t => t.priority === 'low').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    high: tasks.filter(t => t.priority === 'high').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
  };

  const categoryCounts = {};
  tasks.forEach(t => {
    const cat = t.category || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const statusData = [
    { name: 'Pending', value: statusCounts.pending, color: '#FFB800' },
    { name: 'In Progress', value: statusCounts.in_progress, color: '#3B82F6' },
    { name: 'Completed', value: statusCounts.completed, color: '#10B981' },
    { name: 'Blocked', value: statusCounts.blocked, color: '#EF4444' },
  ];

  const priorityData = [
    { name: 'Low', value: priorityCounts.low },
    { name: 'Medium', value: priorityCounts.medium },
    { name: 'High', value: priorityCounts.high },
    { name: 'Urgent', value: priorityCounts.urgent },
  ];

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value,
  }));

  // Calculate completion rate
  const totalTasks = tasks.length;
  const completedTasks = statusCounts.completed;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workload by assignee
  const workloadByUser = {};
  tasks.forEach(t => {
    if (t.assigned_to) {
      workloadByUser[t.assigned_to] = (workloadByUser[t.assigned_to] || 0) + 1;
    }
  });
  const workloadData = Object.entries(workloadByUser)
    .map(([name, count]) => ({ name: name.split('@')[0], tasks: count }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 5);

  // Punch Items Analytics
  const punchStats = {
    total: punchItems.length,
    client_submitted: punchItems.filter(p => p.punch_status === 'client_submitted').length,
    under_review: punchItems.filter(p => p.punch_status === 'under_review').length,
    accepted: punchItems.filter(p => p.punch_status === 'accepted').length,
    rejected: punchItems.filter(p => p.punch_status === 'rejected').length,
    converted_to_task: punchItems.filter(p => p.punch_status === 'converted_to_task').length,
    converted_to_co: punchItems.filter(p => p.punch_status === 'converted_to_change_order').length,
  };

  const punchDistribution = [
    { name: 'New', value: punchStats.client_submitted, color: '#A855F7' },
    { name: 'Review', value: punchStats.under_review, color: '#F59E0B' },
    { name: 'Accepted', value: punchStats.accepted, color: '#10B981' },
    { name: 'Rejected', value: punchStats.rejected, color: '#EF4444' },
    { name: 'Task', value: punchStats.converted_to_task, color: '#3B82F6' },
    { name: 'C.O.', value: punchStats.converted_to_co, color: '#8B5CF6' },
  ];

  // Delays Analysis - tasks overdue or taking longer than expected
  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < now;
  });

  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  
  // Rework Analysis - tasks that moved backwards in status
  const reworkEvents = activityLog.filter(log => 
    log.action?.toLowerCase().includes('status changed') && 
    (log.details?.includes('completed → in_progress') || 
     log.details?.includes('in_progress → pending'))
  );

  // Average task completion time
  const completedTasksWithDates = tasks.filter(t => t.status === 'completed' && t.created_date && t.updated_date);
  const avgCompletionDays = completedTasksWithDates.length > 0
    ? Math.round(
        completedTasksWithDates.reduce((sum, t) => {
          const created = new Date(t.created_date);
          const completed = new Date(t.updated_date);
          const days = (completed - created) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedTasksWithDates.length
      )
    : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl inline-block">
          <h1 className="text-2xl font-bold text-black" style={{ fontSize: '1.575rem' }}>Analytics</h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Tasks</p>
              <p className="text-3xl font-bold text-white mt-1">{totalTasks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Completed</p>
              <p className="text-3xl font-bold text-white mt-1">{completedTasks}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Punch Items</p>
              <p className="text-3xl font-bold text-white mt-1">{punchStats.total}</p>
            </div>
            <Flag className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Overdue</p>
              <p className="text-3xl font-bold text-white mt-1">{overdueTasks.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Rework</p>
              <p className="text-3xl font-bold text-white mt-1">{reworkEvents.length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-orange-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 p-5">
          <p className="text-xs text-slate-400 uppercase mb-2">Avg Completion Time</p>
          <p className="text-2xl font-bold text-white">{avgCompletionDays} days</p>
        </Card>
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 p-5">
          <p className="text-xs text-slate-400 uppercase mb-2">Completion Rate</p>
          <p className="text-2xl font-bold text-white">{completionRate}%</p>
        </Card>
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 p-5">
          <p className="text-xs text-slate-400 uppercase mb-2">Blocked Tasks</p>
          <p className="text-2xl font-bold text-white">{blockedTasks.length}</p>
        </Card>
      </div>

      {/* Punch Items Section */}
      {punchItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-purple-400" />
            Punch Items Analysis
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Punch Distribution */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
              <h4 className="font-semibold text-white mb-4">Punch Status</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={punchDistribution.filter(p => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {punchDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend formatter={(value) => <span className="text-slate-300">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Punch Items List */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
              <h4 className="font-semibold text-white mb-4">Active Punch Items</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {punchItems.filter(p => !['accepted', 'rejected'].includes(p.punch_status)).map((punch) => (
                  <div key={punch.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <span className="text-sm text-white truncate flex-1">{punch.title}</span>
                    <Badge className={`text-xs ${
                      punch.punch_status === 'client_submitted' ? 'bg-purple-500/20 text-purple-400' :
                      punch.punch_status === 'under_review' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {punch.punch_status?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delays & Rework */}
      {(overdueTasks.length > 0 || reworkEvents.length > 0 || blockedTasks.length > 0) && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Issues & Delays
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Overdue */}
            <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-red-400">Overdue Tasks</p>
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{overdueTasks.length}</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {overdueTasks.slice(0, 5).map(t => (
                  <p key={t.id} className="text-xs text-red-300 truncate">• {t.title}</p>
                ))}
              </div>
            </Card>

            {/* Blocked */}
            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-amber-400">Blocked Tasks</p>
                <FileWarning className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{blockedTasks.length}</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {blockedTasks.slice(0, 5).map(t => (
                  <p key={t.id} className="text-xs text-amber-300 truncate">• {t.title}</p>
                ))}
              </div>
            </Card>

            {/* Rework */}
            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-orange-400">Rework Instances</p>
                <RefreshCw className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{reworkEvents.length}</p>
              <p className="text-xs text-orange-300">Tasks that reverted status</p>
            </Card>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-white mb-4">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend 
                  formatter={(value) => <span className="text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-white mb-4">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-white mb-4">Tasks by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload by User */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-white mb-4">Workload by User</h3>
          {workloadData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-slate-400">No assigned tasks</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="tasks" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {statusCounts.blocked > 0 && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">
            There are <strong>{statusCounts.blocked}</strong> blocked tasks that require attention
          </p>
        </div>
      )}
    </div>
  );
}