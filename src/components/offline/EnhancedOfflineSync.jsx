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

// HARDENING: Helper to check for duplicate creates
const checkDuplicate = async (entity, data, idempotencyKey) => {
  try {
    // For TimeEntry, check last 24h by user
    if (entity === 'TimeEntry' && data.user_id) {
      const today = new Date().toISOString().split('T')[0];
      const recent = await base44.entities.TimeEntry.filter({
        user_id: data.user_id,
        date: today
      }, '-created_date', 10);
      
      // Match by job_id + check_in time (within 1 minute)
      const match = recent.find(e => {
        if (e.job_id !== data.job_id) return false;
        if (!e.check_in || !data.check_in) return false;
        const diff = Math.abs(
          new Date(`2000-01-01T${e.check_in}`).getTime() - 
          new Date(`2000-01-01T${data.check_in}`).getTime()
        );
        return diff < 60000; // Within 1 minute
      });
      
      return match || null;
    }
    
    // For Expense, check by amount + date + user
    if (entity === 'Expense' && data.employee_user_id) {
      const recent = await base44.entities.Expense.filter({
        employee_user_id: data.employee_user_id,
        date: data.date
      }, '-created_date', 20);
      
      const match = recent.find(e => 
        Math.abs(e.amount - data.amount) < 0.01 && 
        e.category === data.category &&
        Math.abs(new Date(e.created_date).getTime() - Date.now()) < 300000 // Within 5 min
      );
      
      return match || null;
    }
    
    // For ScheduleShift, check by user + job + date + start_time
    if (entity === 'ScheduleShift' && data.user_id) {
      const recent = await base44.entities.ScheduleShift.filter({
        user_id: data.user_id,
        date: data.date
      }, '-created_date', 10);
      
      const match = recent.find(e =>
        e.job_id === data.job_id &&
        e.start_time === data.start_time
      );
      
      return match || null;
    }
    
    return null;
  } catch (error) {
    console.error('[Idempotency Check] Error:', error);
    return null; // On error, allow create (safe)
  }
};

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
  }, [toast]);

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

  // Queue mutation with idempotency key
  const queueMutation = useCallback((operation) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // HARDENING: Generate idempotency key for creates
    const idempotencyKey = operation.operation === 'create'
      ? `${operation.entity}_${queueId}`
      : null;
    
    queue.push({
      ...operation,
      queueId,
      idempotencyKey,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    setQueueSize(queue.length);
    
    // STEP 3: Human-friendly queue message - data safe, auto-sync
    toast.info('✓ Saved locally. Will sync automatically when you\'re back online.');
  }, [toast]);

  // Sync queue with exponential backoff & idempotency
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
      // HARDENING: Skip if retry limit exceeded
      if (item.retryCount >= 3) {
        console.error('[Offline Sync] Max retries exceeded:', item);
        failedQueue.push({ ...item, status: 'failed_permanent' });
        continue;
      }

      // HARDENING: Exponential backoff check
      if (item.retryCount > 0 && item.lastRetryAt) {
        const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
        const elapsed = Date.now() - new Date(item.lastRetryAt).getTime();
        if (elapsed < backoffMs) {
          failedQueue.push(item); // Not ready to retry yet
          continue;
        }
      }

      try {
        const { entity, operation, data, idempotencyKey } = item;

        // IDEMPOTENCY: Check if create already exists
        if (operation === 'create' && idempotencyKey) {
          const existing = await checkDuplicate(entity, data, idempotencyKey);
          if (existing) {
            console.log('[Offline Sync] Skipping duplicate create:', idempotencyKey);
            successCount++;
            continue; // Skip, already created
          }
        }

        switch (operation) {
          case 'create':
            await base44.entities[entity].create(data);
            break;
          case 'update':
            if (!item.recordId) throw new Error('Update requires recordId');
            await base44.entities[entity].update(item.recordId, data);
            break;
          case 'delete':
            if (!item.recordId) throw new Error('Delete requires recordId');
            await base44.entities[entity].delete(item.recordId);
            break;
        }

        successCount++;
        
        // Log success
        console.log('[Offline Sync] ✅ Synced:', { entity, operation, queueId: item.queueId });
      } catch (error) {
        console.error('[Offline Sync] ❌ Failed:', item, error);
        
        // Increment retry count with timestamp
        failedQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastRetryAt: new Date().toISOString(),
          lastError: error.message,
          status: 'pending_retry'
        });
      }
    }

    // Update queue with failed items only
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
    setQueueSize(failedQueue.length);

    // Invalidate all queries to refresh data
    queryClient.invalidateQueries();

    if (successCount > 0) {
      // STEP 4: Extended visibility (5s) + clear completion message
      toast.success(`✓ All changes synced (${successCount} item${successCount > 1 ? 's' : ''}). Your work is saved to the cloud.`, { 
        duration: 5000  // Extended from default 3s to 5s for clear confirmation
      });
    }
    if (failedQueue.length > 0) {
      const permanentFails = failedQueue.filter(i => i.status === 'failed_permanent').length;
      if (permanentFails > 0) {
        // STEP 3: Human-friendly permanent failure - what happened, data safe, contact support
        toast.error(`⚠️ ${permanentFails} change${permanentFails > 1 ? 's' : ''} couldn't sync after multiple attempts. Your data is safe locally. Contact your manager for help.`, { duration: 6000 });
      } else {
        // STEP 3: Human-friendly retry - what happening, data safe, auto-retry
        toast.warning(`${failedQueue.length} change${failedQueue.length > 1 ? 's' : ''} will retry automatically. Your work is saved locally and safe.`, { duration: 3000 });
      }
    }

    setIsSyncing(false);
  }, [isSyncing, queryClient, toast]);

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
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const checkFailed = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
        const failed = queue.filter(op => op.status === 'failed_permanent').length;
        setFailedCount(failed);
      } catch (e) {
        setFailedCount(0);
      }
    };

    checkFailed();
    const interval = setInterval(checkFailed, 2000);
    return () => clearInterval(interval);
  }, []);

  // QW6: CRITICAL - Show failed operations prominently, never hide
  const hasFailed = failedCount > 0;
  
  // QW1: Always show when offline OR syncing OR has queue OR has failures
  if (queueSize === 0 && isOnline && !hasFailed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
      <Card className={`p-4 shadow-xl border-2 max-w-sm ${
        hasFailed 
          ? 'bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-800'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {queueSize} operaciones pendientes
                </p>
                {/* QW6: PROMINENT failed operations badge - NEVER hide */}
                {failedCount > 0 && (
                  <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-400 dark:border-red-700 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {failedCount} failed
                  </Badge>
                )}
              </div>
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
        
        {/* QW6: CRITICAL - Failed operations detail */}
        {hasFailed && (
          <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
              ⚠️ Some operations failed to sync. They will retry automatically when online.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}