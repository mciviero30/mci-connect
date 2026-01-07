import React, { useState, useEffect } from 'react';
import { WifiOff, Cloud, CloudOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fieldStorage } from './services/FieldStorageService';

export default function UniversalSyncIndicator({ jobId }) {
  const [state, setState] = useState('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check sync status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const unsynced = await fieldStorage.getUnsyncedCount(jobId);
        const conflicts = await fieldStorage.getConflicts(jobId);
        
        setUnsyncedCount(unsynced);
        setConflictCount(conflicts.length);

        // Determine state priority: offline > conflict > syncing > error > synced
        if (!isOnline) {
          setState('offline');
        } else if (conflicts.length > 0) {
          setState('conflict');
        } else if (unsynced > 0) {
          setState('syncing');
        } else {
          setState('synced');
        }
      } catch (error) {
        setState('error');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [jobId, isOnline]);

  const stateConfig = {
    offline: {
      icon: WifiOff,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Offline',
      tooltip: 'Working offline - changes will sync when online'
    },
    syncing: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: `Syncing ${unsyncedCount}`,
      tooltip: `Syncing ${unsyncedCount} item${unsyncedCount !== 1 ? 's' : ''}`,
      spin: true
    },
    synced: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Synced',
      tooltip: 'All changes saved'
    },
    error: {
      icon: CloudOff,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'Error',
      tooltip: 'Sync error - retrying automatically'
    },
    conflict: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: `${conflictCount} Conflict${conflictCount !== 1 ? 's' : ''}`,
      tooltip: 'Sync conflicts detected - manual resolution needed'
    }
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div 
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 ${config.bgColor} ${config.color} px-3 py-2 rounded-lg shadow-lg border border-current/20 flex items-center gap-2 backdrop-blur-sm`}
      title={config.tooltip}
    >
      <Icon className={`w-4 h-4 ${config.spin ? 'animate-spin' : ''}`} />
      <span className="text-xs font-bold">{config.label}</span>
    </div>
  );
}