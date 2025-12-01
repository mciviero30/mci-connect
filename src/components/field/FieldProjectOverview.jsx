import React from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  MapPin,
  Calendar,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

export default function FieldProjectOverview({ job, tasks, plans }) {
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  const stats = [
    { label: 'Pendientes', value: pendingTasks, icon: Clock, color: 'amber' },
    { label: 'En Progreso', value: inProgressTasks, icon: CheckSquare, color: 'blue' },
    { label: 'Completadas', value: completedTasks, icon: CheckCircle2, color: 'green' },
    { label: 'Bloqueadas', value: blockedTasks, icon: AlertTriangle, color: 'red' },
  ];

  const colorClasses = {
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#D4C85C] mb-6">Resumen del Proyecto</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={`bg-gradient-to-br ${colorClasses[stat.color]} border rounded-xl p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Project Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Información del Proyecto</h3>
          <div className="space-y-3">
            {job.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-400">Dirección</p>
                  <p className="text-white">{job.address}</p>
                </div>
              </div>
            )}
            {(job.start_date_field || job.created_date) && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-400">Fecha de Inicio</p>
                  <p className="text-white">
                    {format(new Date(job.start_date_field || job.created_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
            {job.client_name_field && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-400">Cliente</p>
                  <p className="text-white">{job.client_name_field}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Planos ({plans.length})</h3>
          {plans.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay planos subidos</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {plans.slice(0, 4).map((plan) => (
                <div key={plan.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-700">
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
      <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Tareas Recientes</h3>
        {tasks.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay tareas creadas</p>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'blocked' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  <span className="text-white">{task.title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
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