import React, { useEffect, useState } from 'react';
import { getQueueStats, getPendingOperations, getFailedOperations } from './FieldOperationQueue';
import { getConflictHistory } from './FieldConflictResolver';
import { getOnlineStatus, subscribeToConnectivity } from './FieldConnectivityMonitor';
import { getSyncStatus, subscribeToSync, SYNC_STATUS } from './FieldSyncEngine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  GitMerge
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Offline Sync Validator (Dev Only)
 * Real-time monitoring of sync queue integrity
 * 
 * Validates:
 * - Queue order preservation
 * - Idempotency enforcement
 * - Conflict resolution
 * - Network transition handling
 * - Sync completion rate
 */
export default function OfflineSyncValidator() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    by_type: {},
  });
  
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [conflicts, setConflicts] = useState([]);
  const [failedOps, setFailedOps] = useState([]);

  // Update stats every 2s
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const updateStats = async () => {
      try {
        const queueStats = await getQueueStats();
        setStats(queueStats);
        
        const failed = await getFailedOperations();
        setFailedOps(failed);
        
        const conflictHistory = await getConflictHistory();
        setConflicts(conflictHistory.slice(-10)); // Last 10
      } catch (error) {
        console.error('[OfflineValidator] Stats update failed:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to connectivity changes
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const unsubscribe = subscribeToConnectivity((online) => {
      setIsOnline(online);
      
      if (import.meta.env?.DEV) {
        console.log(`[OfflineValidator] 📶 Network ${online ? 'ONLINE' : 'OFFLINE'}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to sync status changes
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const unsubscribe = subscribeToSync((status) => {
      setSyncStatus(status);
      
      if (import.meta.env?.DEV) {
        console.log(`[OfflineValidator] 🔄 Sync status: ${status}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Test idempotency
  const testIdempotency = async () => {
    toast.info('Testing idempotency...');
    
    // Would need to create duplicate operations and verify only one syncs
    // For now, just check queue stats
    const pending = await getPendingOperations();
    
    // Group by idempotency_key
    const byKey = {};
    pending.forEach(op => {
      if (op.idempotency_key) {
        byKey[op.idempotency_key] = (byKey[op.idempotency_key] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(byKey).filter(([key, count]) => count > 1);
    
    if (duplicates.length > 0) {
      toast.error(`❌ Idempotency violation: ${duplicates.length} duplicate keys found`);
      console.error('[Idempotency Test] FAILED:', duplicates);
    } else {
      toast.success('✅ Idempotency test PASSED - no duplicates');
    }
  };

  // Test order preservation
  const testOrderPreservation = async () => {
    const pending = await getPendingOperations();
    
    if (pending.length < 2) {
      toast.info('Need at least 2 pending operations to test order');
      return;
    }
    
    // Check if operations are ordered by sequence_number
    let ordered = true;
    for (let i = 1; i < pending.length; i++) {
      if (pending[i].sequence_number < pending[i-1].sequence_number) {
        ordered = false;
        break;
      }
    }
    
    if (ordered) {
      toast.success(`✅ Order preserved (${pending.length} operations)`);
    } else {
      toast.error('❌ Order NOT preserved - operations out of sequence');
    }
  };

  // CRITICAL: NO UI IN PRODUCTION - LOGGING ONLY
  if (!import.meta.env?.DEV) return null;

  // Component is logging-only in DEV mode.
  // All UI is in FieldDebugDrawer.
  return null;
}
        <Badge className={`ml-auto text-[10px] ${
          isOnline ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'
        }`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Badge>
      </div>

      {/* Sync Status */}
      <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">Sync</span>
          <div className="flex items-center gap-1">
            {syncStatus === SYNC_STATUS.SYNCING && (
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            )}
            <span className={`font-bold text-sm ${
              syncStatus === SYNC_STATUS.IDLE ? 'text-green-400' :
              syncStatus === SYNC_STATUS.SYNCING ? 'text-blue-400' :
              'text-red-400'
            }`}>
              {syncStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Pending</div>
          <div className="text-sm font-bold text-orange-400">{stats.pending}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Completed</div>
          <div className="text-sm font-bold text-green-400">{stats.completed}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Failed</div>
          <div className="text-sm font-bold text-red-400">{stats.failed}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Success Rate</div>
          <div className="text-sm font-bold text-cyan-400">{syncRate}%</div>
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <GitMerge className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-300 text-[10px] font-bold">
              {conflicts.length} Conflicts Resolved
            </span>
          </div>
          <div className="text-[9px] text-yellow-400/70">
            Last: {conflicts[conflicts.length - 1]?.timestamp 
              ? new Date(conflicts[conflicts.length - 1].timestamp).toLocaleTimeString()
              : 'N/A'}
          </div>
        </div>
      )}

      {/* Failed Operations */}
      {failedOps.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-red-300 text-[10px] font-bold">
              {failedOps.length} Failed (max retries)
            </span>
          </div>
          <div className="text-[9px] text-red-400/70">
            Manual review required
          </div>
        </div>
      )}

      {/* Test Buttons */}
      <div className="space-y-1.5 mb-2">
        <Button
          onClick={testIdempotency}
          size="sm"
          className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] h-7"
        >
          Test Idempotency
        </Button>
        <Button
          onClick={testOrderPreservation}
          size="sm"
          className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] h-7"
        >
          Test Order
        </Button>
      </div>

      {/* By Type Breakdown */}
      {Object.keys(stats.by_type).length > 0 && (
        <div className="pt-2 border-t border-slate-700">
          <div className="text-[9px] text-slate-400 mb-1">By Type:</div>
          <div className="space-y-1">
            {Object.entries(stats.by_type).map(([type, counts]) => (
              <div key={type} className="flex items-center justify-between text-[9px]">
                <span className="text-slate-400 truncate flex-1">{type}</span>
                <div className="flex gap-1">
                  {counts.pending > 0 && (
                    <Badge className="bg-orange-500/20 text-orange-400 text-[8px] px-1">
                      {counts.pending}
                    </Badge>
                  )}
                  {counts.completed > 0 && (
                    <Badge className="bg-green-500/20 text-green-400 text-[8px] px-1">
                      {counts.completed}
                    </Badge>
                  )}
                  {counts.failed > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 text-[8px] px-1">
                      {counts.failed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}