import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  Wrench,
  HelpCircle,
  Search,
  AlertCircle
} from 'lucide-react';

const categoryIcons = {
  change_order: FileText,
  installation: Wrench,
  rfi: HelpCircle,
  inspection: Search,
  issue: AlertCircle,
  general: Clock,
};

const statusColors = {
  pending: 'bg-amber-500 border-amber-300',
  in_progress: 'bg-blue-500 border-blue-300',
  completed: 'bg-green-500 border-green-300',
  blocked: 'bg-red-500 border-red-300',
};

const priorityRings = {
  urgent: 'ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900',
  high: 'ring-2 ring-orange-400 ring-offset-1 ring-offset-slate-900',
  medium: '',
  low: '',
};

export default function TaskPin({ task, onClick, isSelected }) {
  if (task.pin_x === undefined || task.pin_y === undefined) return null;

  const Icon = categoryIcons[task.category] || Clock;
  const statusColor = statusColors[task.status] || statusColors.pending;
  const priorityRing = priorityRings[task.priority] || '';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110 z-10 ${
        isSelected ? 'scale-125 z-20' : ''
      }`}
      style={{ left: `${task.pin_x}%`, top: `${task.pin_y}%` }}
    >
      {/* Pin stem */}
      <div className="relative">
        <div className={`w-8 h-8 rounded-full ${statusColor} border-2 border-white shadow-lg flex items-center justify-center ${priorityRing}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {/* Pin point */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
            border-l-[6px] border-l-transparent 
            border-r-[6px] border-r-transparent 
            border-t-[8px] ${
              task.status === 'pending' ? 'border-t-amber-500' :
              task.status === 'in_progress' ? 'border-t-blue-500' :
              task.status === 'completed' ? 'border-t-green-500' :
              'border-t-red-500'
            }`}
        />
        {/* Tooltip */}
        {isSelected && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-slate-800 rounded-lg shadow-xl whitespace-nowrap z-30">
            <p className="text-sm font-medium text-white">{task.title}</p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-800" />
          </div>
        )}
      </div>
    </button>
  );
}