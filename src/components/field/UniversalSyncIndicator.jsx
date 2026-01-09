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
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      borderColor: 'border-amber-200 dark:border-amber-700',
      label: 'Offline',
      userMessage: 'Working offline'
    },
    syncing: {
      icon: Loader2,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-700',
      label: 'Syncing',
      userMessage: 'Saving to cloud',
      spin: true
    },
    synced: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-700',
      label: 'Saved',
      userMessage: 'All saved'
    },
    error: {
      icon: CloudOff,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      label: 'Error',
      userMessage: 'Retrying'
    },
    conflict: {
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700',
      label: 'Needs review',
      userMessage: 'Tap to resolve'
    }
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  // Auto-hide "synced" after 2 seconds
  useEffect(() => {
    if (state === 'synced') {
      const timer = setTimeout(() => {
        // Component will naturally hide when next check runs
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Hide synced state to reduce visual noise
  if (state === 'synced' && unsyncedCount === 0) return null;

  return (
    <div 
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 ${config.bgColor} ${config.borderColor} border-2 radius-md shadow-enterprise-md flex items-center gap-2 px-3 py-2 backdrop-blur-sm`}
    >
      <Icon className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`} strokeWidth={2.5} />
      <span className={`text-xs font-bold ${config.color}`}>
        {config.userMessage}
      </span>
      {unsyncedCount > 0 && state === 'syncing' && (
        <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
          <span className="text-[10px] font-bold text-blue-900 dark:text-blue-100">{unsyncedCount}</span>
        </div>
      )}
    </div>
  );
}