import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Clock, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getTaskOfflineSync } from '../services/TaskOfflineSync';
import { format } from 'date-fns';

/**
 * TaskOfflineQueue Component
 * Displays pending/failed tasks waiting for sync
 * Shows sync status and retry/delete actions
 */
export default function TaskOfflineQueue() {
  const [queuedTasks, setQueuedTasks] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const offlineSync = getTaskOfflineSync();

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = offlineSync.subscribe(({ isOnline, syncInProgress }) => {
      setIsOnline(isOnline);
      setSyncInProgress(syncInProgress);
    });

    // Load initial queue
    loadQueue();

    return () => unsubscribe();
  }, []);

  const loadQueue = async () => {
    try {
      const tasks = await offlineSync.getQueuedTasks();
      setQueuedTasks(tasks);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const handleRetry = async (temp_id) => {
    await offlineSync.retryTask(temp_id);
    loadQueue();
  };

  const handleDelete = async (temp_id) => {
    if (confirm('Delete this task? It will not be synced.')) {
      await offlineSync.deleteTask(temp_id);
      loadQueue();
    }
  };

  // Don't show if queue is empty
  if (queuedTasks.length === 0) return null;

  const pendingCount = queuedTasks.filter(t => t.status === 'pending').length;
  const failedCount = queuedTasks.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-4 p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="font-semibold text-orange-900 dark:text-orange-100">
            Offline Tasks ({queuedTasks.length})
          </h3>
        </div>
        {syncInProgress && (
          <Badge className="bg-blue-500 animate-pulse">Syncing...</Badge>
        )}
      </div>

      {/* Status message */}
      {!isOnline && (
        <div className="text-sm text-orange-700 dark:text-orange-200">
          📵 You're offline. Tasks will sync when you reconnect.
        </div>
      )}

      {pendingCount > 0 && isOnline && !syncInProgress && (
        <div className="text-sm text-blue-700 dark:text-blue-200">
          ⏳ {pendingCount} task(s) ready to sync...
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {queuedTasks.map((task) => (
          <Card
            key={task.temp_id}
            className={`p-3 border-l-4 ${
              task.status === 'failed'
                ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                : task.status === 'syncing'
                ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-l-orange-500 bg-white dark:bg-slate-800 border-dashed'
            }`}
          >
            <div className="space-y-2">
              {/* Title & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(task.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {task.status === 'syncing' && (
                    <Badge className="bg-blue-500 text-white animate-pulse">
                      <Clock className="w-3 h-3 mr-1" />
                      Syncing
                    </Badge>
                  )}
                  {task.status === 'failed' && (
                    <Badge className="bg-red-500 text-white">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  {task.status === 'pending' && !syncInProgress && (
                    <Badge className="bg-orange-500 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {task.description && (
                  <p className="truncate">{task.description}</p>
                )}
                <div className="flex gap-4">
                  <span>👤 {task.assignee}</span>
                  <span>🎯 {task.priority}</span>
                </div>
                {task.retry_count > 0 && (
                  <span className="text-orange-600 dark:text-orange-400">
                    Retry attempt: {task.retry_count}/{3}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 pt-2">
                {task.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => handleRetry(task.temp_id)}
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDelete(task.temp_id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-orange-200 dark:border-orange-800">
        {pendingCount > 0 && <span>⏳ {pendingCount} pending • </span>}
        {failedCount > 0 && <span>🔴 {failedCount} failed</span>}
      </div>
    </div>
  );
}