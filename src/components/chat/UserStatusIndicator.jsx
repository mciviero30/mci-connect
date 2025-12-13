import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  online: { color: 'bg-green-500', label: 'Online' },
  away: { color: 'bg-yellow-500', label: 'Away' },
  busy: { color: 'bg-red-500', label: 'Busy' },
  dnd: { color: 'bg-red-600', label: 'Do Not Disturb' },
  offline: { color: 'bg-slate-400', label: 'Offline' }
};

export default function UserStatusIndicator({ status = 'offline', size = 'sm', showLabel = false, className }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  
  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className={cn(
        'rounded-full ring-2 ring-white dark:ring-slate-800',
        config.color,
        sizeClasses[size]
      )} />
      {showLabel && (
        <span className="text-xs text-slate-600 dark:text-slate-400">{config.label}</span>
      )}
    </div>
  );
}

export { STATUS_CONFIG };