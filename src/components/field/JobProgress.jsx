import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function JobProgress({ tasks }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Work Progress</h3>
        <span className="text-2xl font-bold text-[#FFB800]">{completionPercentage}%</span>
      </div>
      
      <Progress value={completionPercentage} className="h-3 mb-4" />
      
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Completed</p>
            <p className="text-lg font-bold text-white">{completedTasks}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">In Progress</p>
            <p className="text-lg font-bold text-white">{inProgressTasks}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Pending</p>
            <p className="text-lg font-bold text-white">{pendingTasks}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-600">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{completedTasks}</span> of{' '}
          <span className="font-semibold text-white">{totalTasks}</span> walls completed
        </p>
      </div>
    </div>
  );
}