import React from 'react';
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
  AlertTriangle
} from 'lucide-react';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];

export default function FieldAnalyticsView({ jobId, tasks }) {
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
    { name: 'Pending', value: statusCounts.pending, color: '#F5A623' },
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5A623] mb-6">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/20 dark:to-amber-600/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Tasks</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalTasks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-50" />
          </div>
        </div>
        <div className="bg-green-50 dark:bg-gradient-to-br dark:from-green-500/20 dark:to-green-600/20 border border-green-200 dark:border-green-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Completed</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{completedTasks}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400 opacity-50" />
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">In Progress</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{statusCounts.in_progress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-50" />
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-500/20 dark:to-purple-600/20 border border-purple-200 dark:border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">% Completed</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{completionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 dark:text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Status Distribution</h3>
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
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Priority Distribution</h3>
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
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Tasks by Category</h3>
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
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Workload by User</h3>
          {workloadData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-slate-500 dark:text-slate-400">No assigned tasks</p>
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
            Hay <strong>{statusCounts.blocked}</strong> tareas bloqueadas que requieren atención
          </p>
        </div>
      )}
    </div>
  );
}