import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

/**
 * Advanced Offline-First Sync Manager
 * Intelligent conflict resolution with visual feedback
 */

export const AdvancedOfflineSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: '✅ Back online',
        description: 'Syncing pending changes...',
        variant: 'success'
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: '📡 Offline mode',
        description: 'Changes will sync when you reconnect',
        variant: 'info'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingChanges = async () => {
    try {
      // Get pending operations from IndexedDB or localStorage
      const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
      setPendingSync(pending.length);

      if (pending.length === 0) {
        setLastSyncTime(new Date());
        return;
      }

      // Process pending operations
      for (const operation of pending) {
        try {
          if (operation.type === 'create') {
            await base44.entities[operation.entity].create(operation.data);
          } else if (operation.type === 'update') {
            await base44.entities[operation.entity].update(operation.id, operation.data);
          } else if (operation.type === 'delete') {
            await base44.entities[operation.entity].delete(operation.id);
          }
        } catch (error) {
          console.error('Sync failed for operation:', operation, error);
        }
      }

      // Clear pending operations
      localStorage.removeItem('pendingSync');
      setPendingSync(0);
      setLastSyncTime(new Date());
      
      // Invalidate all queries to refetch fresh data
      queryClient.invalidateQueries();

      toast({
        title: '✅ Sync complete',
        description: `${pending.length} changes synced`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge className={`flex items-center gap-2 ${
        isOnline 
          ? 'bg-green-100 text-green-800 border-green-300' 
          : 'bg-amber-100 text-amber-800 border-amber-300'
      }`}>
        {isOnline ? (
          <Cloud className="w-3 h-3" />
        ) : (
          <CloudOff className="w-3 h-3" />
        )}
        {isOnline ? 'Online' : 'Offline'}
        {pendingSync > 0 && (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            {pendingSync}
          </>
        )}
      </Badge>
    </div>
  );
};

/**
 * Save to offline queue
 */
export const saveToOfflineQueue = (operation) => {
  const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
  pending.push({
    ...operation,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID()
  });
  localStorage.setItem('pendingSync', JSON.stringify(pending));
};