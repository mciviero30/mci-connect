import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OfflineSyncIndicator({ pendingChanges = 0, onSync }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | success | error
  const [lastSync, setLastSync] = useState(null);

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

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingChanges > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline || syncStatus === 'syncing') return;
    
    setSyncStatus('syncing');
    try {
      await onSync?.();
      setSyncStatus('success');
      setLastSync(new Date());
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const diff = Date.now() - lastSync.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border ${
        isOnline 
          ? 'bg-green-500/10 border-green-500/30 text-green-500' 
          : 'bg-red-500/10 border-red-500/30 text-red-500'
      }`}>
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-xs font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Pending Changes */}
      {pendingChanges > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-2 rounded-lg shadow-lg">
          <CloudOff className="w-4 h-4" />
          <span className="text-xs font-medium">
            {pendingChanges} pending
          </span>
          {isOnline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="h-6 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/20"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Cloud className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Sync Status */}
      {syncStatus === 'success' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-500 px-3 py-2 rounded-lg shadow-lg animate-in fade-in">
          <Check className="w-4 h-4" />
          <span className="text-xs font-medium">Synced</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 px-3 py-2 rounded-lg shadow-lg animate-in fade-in">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">Sync failed</span>
        </div>
      )}

      {/* Last Sync Time */}
      {lastSync && syncStatus === 'idle' && pendingChanges === 0 && (
        <div className="text-[10px] text-slate-400">
          Last sync: {formatLastSync()}
        </div>
      )}
    </div>
  );
}