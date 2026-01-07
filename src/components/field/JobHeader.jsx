import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function JobHeader({ job, syncStatus = 'synced' }) {
  const statusConfig = {
    in_progress: { 
      label: 'In Progress', 
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      icon: Loader2
    },
    blocked: { 
      label: 'Blocked', 
      color: 'bg-red-500/20 text-red-400 border-red-500/40',
      icon: AlertTriangle
    },
    completed: { 
      label: 'Completed', 
      color: 'bg-green-500/20 text-green-400 border-green-500/40',
      icon: CheckCircle2
    },
    active: { 
      label: 'Active', 
      color: 'bg-green-500/20 text-green-400 border-green-500/40',
      icon: CheckCircle2
    },
  };

  const syncConfig = {
    synced: {
      icon: Wifi,
      color: 'text-green-400',
      label: 'Synced',
      bgColor: 'bg-green-500/10'
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      label: 'Pending Changes',
      bgColor: 'bg-yellow-500/10'
    },
    offline: {
      icon: WifiOff,
      color: 'text-red-400',
      label: 'Offline',
      bgColor: 'bg-red-500/10'
    }
  };

  const currentStatus = statusConfig[job?.status] || statusConfig.in_progress;
  const currentSync = syncConfig[syncStatus] || syncConfig.synced;
  const StatusIcon = currentStatus.icon;
  const SyncIcon = currentSync.icon;

  return (
    <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-xl">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white truncate mb-2">
              {job?.name || job?.job_name_field || 'Untitled Project'}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs px-3 py-1 font-bold border ${currentStatus.color}`}>
                <StatusIcon className="w-3 h-3 mr-1.5" />
                {currentStatus.label}
              </Badge>
            </div>
          </div>

          {/* Sync Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentSync.bgColor} border border-slate-700`}>
            <SyncIcon className={`w-4 h-4 ${currentSync.color}`} />
            <span className={`text-xs font-medium ${currentSync.color} hidden sm:inline`}>
              {currentSync.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}