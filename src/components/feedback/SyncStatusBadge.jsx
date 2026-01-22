import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

/**
 * Inline sync status indicator
 * Uses existing badge/icon patterns - NO new UI
 */
export function SyncStatusBadge({ status, onRetry }) {
  if (!status || status === 'synced') return null;

  const configs = {
    pending: {
      icon: Clock,
      label: 'Pending sync',
      labelEs: 'Pendiente',
      className: 'bg-amber-100 text-amber-700 border-amber-300',
      iconClassName: 'w-3 h-3'
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing...',
      labelEs: 'Sincronizando...',
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      iconClassName: 'w-3 h-3 animate-spin'
    },
    pending_retry: {
      icon: Clock,
      label: 'Will retry',
      labelEs: 'Reintentará',
      className: 'bg-orange-100 text-orange-700 border-orange-300',
      iconClassName: 'w-3 h-3'
    },
    failed_permanent: {
      icon: AlertCircle,
      label: 'Sync failed',
      labelEs: 'Error',
      className: 'bg-red-100 text-red-700 border-red-300',
      iconClassName: 'w-3 h-3',
      showRetry: true
    },
    offline: {
      icon: WifiOff,
      label: 'Saved offline',
      labelEs: 'Guardado offline',
      className: 'bg-slate-100 text-slate-700 border-slate-300',
      iconClassName: 'w-3 h-3'
    }
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;
  const language = localStorage.getItem('language') || 'en';
  const label = language === 'es' ? config.labelEs : config.label;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.className} text-xs flex items-center gap-1.5`}>
        <Icon className={config.iconClassName} />
        {label}
      </Badge>
      {config.showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-600 hover:text-red-700 underline font-medium"
        >
          {language === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      )}
    </div>
  );
}

/**
 * Hook to get sync status from queue
 */
export function useSyncStatus(entityType, entityId) {
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    // Check offline queue for this entity
    const checkQueue = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
        
        // Find operations for this entity+id
        const pendingOps = queue.filter(op => {
          if (op.entity !== entityType) return false;
          if (entityId && op.entityId && op.entityId !== entityId) return false;
          return true;
        });

        if (pendingOps.length === 0) {
          setStatus(null);
          return;
        }

        // Check statuses
        const hasFailedPermanent = pendingOps.some(op => op.status === 'failed_permanent');
        const hasPendingRetry = pendingOps.some(op => op.status === 'pending_retry');
        const hasPending = pendingOps.some(op => op.status === 'pending');

        if (hasFailedPermanent) {
          setStatus('failed_permanent');
        } else if (hasPendingRetry) {
          setStatus('pending_retry');
        } else if (hasPending) {
          setStatus('pending');
        } else {
          setStatus(null);
        }
      } catch (error) {
        console.error('[SyncStatus] Error checking queue:', error);
        setStatus(null);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, [entityType, entityId]);

  return status;
}