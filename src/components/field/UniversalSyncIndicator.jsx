import React, { useState, useEffect } from 'react';
import { WifiOff, Cloud, CloudOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fieldStorage } from './services/FieldStorageService';

export default function UniversalSyncIndicator({ jobId }) {
  const [state, setState] = useState('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [savedConfirmVisible, setSavedConfirmVisible] = useState(false); // QW3 control

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
      // STEP 4: Clarity - explicit "All changes synced" not just "All saved"
      userMessage: '✓ All changes synced'
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

  // QW3 FIX: Keep "synced" visible 5s (not 2s) for user confirmation
  useEffect(() => {
    if (state === 'synced' && unsyncedCount === 0) {
      setSavedConfirmVisible(true);
      const timer = setTimeout(() => {
        setSavedConfirmVisible(false);
      }, 5000); // Extended from 2s to 5s
      return () => clearTimeout(timer);
    }
  }, [state, unsyncedCount]);

  // STEP 2: Show indicator when conflicts, syncing, or has pending count
  // E2 FIX: NEVER hide if conflicts exist (CRITICAL)
  if (conflictCount > 0) {
    // Force conflict state - ALWAYS visible
  } else if (state === 'synced' && unsyncedCount === 0 && !savedConfirmVisible) {
    return null; // Only hide after 5s delay
  }

  return (
    <div 
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 ${config.bgColor} ${config.borderColor} border-2 radius-md shadow-enterprise-md flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm ${
        conflictCount > 0 ? 'animate-pulse' : ''
      } ${state === 'synced' ? 'shadow-enterprise-lg' : ''}`}
      onClick={conflictCount > 0 ? () => {
        // STEP 3: Human-friendly conflict message - what happened, data safe, what to do
        alert(`⚠️ ${conflictCount} change${conflictCount > 1 ? 's' : ''} conflict${conflictCount > 1 ? '' : 's'} with server data.\n\nYour work is safe. The app will try to merge changes automatically.\n\nIf you see this message again, contact your manager.`);
      } : undefined}
    >
      <Icon className={`w-5 h-5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} strokeWidth={2.5} />
      {/* STEP 4: Larger, bolder text for readability */}
      <span className={`text-sm font-bold ${config.color}`}>
        {config.userMessage}
      </span>
      {/* E2 FIX: Show conflict count prominently */}
      {conflictCount > 0 && (
        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
          <span className="text-[10px] font-bold text-white">⚠️{conflictCount}</span>
        </div>
      )}
      {/* STEP 2: Always show pending count when syncing (real-time update) */}
      {unsyncedCount > 0 && state === 'syncing' && (
        <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
          <span className="text-[10px] font-bold text-blue-900 dark:text-blue-100">{unsyncedCount}</span>
        </div>
      )}
    </div>
  );
}