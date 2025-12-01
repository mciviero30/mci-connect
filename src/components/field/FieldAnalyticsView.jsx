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
    { name: 'Pendientes', value: statusCounts.pending, color: '#F59E0B' },
    { name: 'En Progreso', value: statusCounts.in_progress, color: '#3B82F6' },
    { name: 'Completadas', value: statusCounts.completed, color: '#10B981' },
    { name: 'Bloqueadas', value: statusCounts.blocked, color: '#EF4444' },
  ];

  const priorityData = [
    { name: 'Baja', value: priorityCounts.low },
    { name: 'Media', value: priorityCounts.medium },
    { name: 'Alta', value: priorityCounts.high },
    { name: 'Urgente', value: priorityCounts.urgent },
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
      <h1 className="text-2xl font-bold text-[#D4C85C] mb-6">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Tareas</p>
              <p className="text-3xl font-bold text-white mt-1">{totalTasks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Completadas</p>
              <p className="text-3xl font-bold text-white mt-1">{completedTasks}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">En Progreso</p>
              <p className="text-3xl font-bold text-white mt-1">{statusCounts.in_progress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">% Completado</p>
              <p className="text-3xl font-bold text-white mt-1">{completionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Distribución por Estado</h3>
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
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Distribución por Prioridad</h3>
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
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Tareas por Categoría</h3>
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
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Carga de Trabajo por Usuario</h3>
          {workloadData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-slate-400">Sin tareas asignadas</p>
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