import React from 'react';
import { CheckSquare, Camera, AlertTriangle, Map, TrendingUp } from 'lucide-react';

export default function JobActions({ onNavigate }) {
  const actions = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      color: 'from-blue-600 to-blue-500',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/40'
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: Camera,
      color: 'from-purple-600 to-purple-500',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/40'
    },
    {
      id: 'activity',
      label: 'Incidents',
      icon: AlertTriangle,
      color: 'from-red-600 to-red-500',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40'
    },
    {
      id: 'plans',
      label: 'Blueprints',
      icon: Map,
      color: 'from-cyan-600 to-cyan-500',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/40'
    },
    {
      id: 'overview',
      label: 'Progress',
      icon: TrendingUp,
      color: 'from-green-600 to-green-500',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/40'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className={`p-6 rounded-2xl border ${action.borderColor} ${action.bgColor} hover:scale-105 transition-all active:scale-95 min-h-[120px] flex flex-col items-center justify-center gap-3 group`}
          >
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span className={`font-bold text-sm ${action.textColor}`}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}