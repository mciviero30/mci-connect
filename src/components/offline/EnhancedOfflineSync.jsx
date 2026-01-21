import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const QUEUE_KEY = 'offline_mutation_queue';
const CACHE_KEY = 'offline_cache_data';

export function useEnhancedOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada - Sincronizando...');
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sin conexión - Modo offline activado');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue size
  useEffect(() => {
    const updateQueueSize = () => {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      setQueueSize(queue.length);
    };

    updateQueueSize();
    const interval = setInterval(updateQueueSize, 1000);
    return () => clearInterval(interval);
  }, []);

  // Queue mutation
  const queueMutation = useCallback((operation) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}-${Math.random()}`,
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    setQueueSize(queue.length);
    
    toast.info('Operación guardada - Se sincronizará cuando haya conexión');
  }, []);

  // Sync queue
  const syncQueue = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    
    if (queue.length === 0) {
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let failedQueue = [];

    for (const item of queue) {
      try {
        const { entity, operation, data } = item;

        switch (operation) {
          case 'create':
            await base44.entities[entity].create(data);
            break;
          case 'update':
            await base44.entities[entity].update(item.recordId, data);
            break;
          case 'delete':
            await base44.entities[entity].delete(item.recordId);
            break;
        }

        successCount++;
      } catch (error) {
        console.error('Error syncing mutation:', error);
        failedQueue.push(item);
      }
    }

    // Update queue with failed items only
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
    setQueueSize(failedQueue.length);

    // Invalidate all queries to refresh data
    queryClient.invalidateQueries();

    if (successCount > 0) {
      toast.success(`${successCount} operaciones sincronizadas`);
    }
    if (failedQueue.length > 0) {
      toast.error(`${failedQueue.length} operaciones fallaron`);
    }

    setIsSyncing(false);
  }, [isSyncing, queryClient]);

  // Cache data for offline access
  const cacheData = useCallback((key, data) => {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[key] = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  // Get cached data
  const getCachedData = useCallback((key) => {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return cache[key]?.data || null;
  }, []);

  return {
    isOnline,
    queueSize,
    isSyncing,
    queueMutation,
    syncQueue,
    cacheData,
    getCachedData,
  };
}

export default function EnhancedOfflineSync() {
  const { isOnline, queueSize, isSyncing, syncQueue } = useEnhancedOfflineSync();

  if (queueSize === 0 && isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
      <Card className="p-4 bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-200 dark:border-slate-700 max-w-sm">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm text-slate-900 dark:text-white">
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </p>
            {queueSize > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {queueSize} operaciones pendientes
              </p>
            )}
          </div>
          {isOnline && queueSize > 0 && (
            <Button
              size="sm"
              onClick={syncQueue}
              disabled={isSyncing}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}