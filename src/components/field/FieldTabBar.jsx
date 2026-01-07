import React from 'react';
import { CheckSquare, Camera, AlertTriangle, Map, TrendingUp } from 'lucide-react';

export default function FieldTabBar({ activePanel, onPanelChange }) {
  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'activity', label: 'Incidents', icon: AlertTriangle },
    { id: 'plans', label: 'Blueprints', icon: Map },
    { id: 'overview', label: 'Progress', icon: TrendingUp },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t-2 border-slate-700 shadow-2xl md:hidden">
      <div className="grid grid-cols-5 gap-0 px-2 py-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onPanelChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 min-h-[60px] ${
                isActive
                  ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-black' : ''}`} />
              <span className={`text-[10px] font-bold ${isActive ? 'text-black' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}