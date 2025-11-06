import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingCount, syncMutations } from './mutationQueue';
import { useToast } from '@/components/ui/toast';

export default function OfflineIndicator({ isOnline, onSyncComplete }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const { toast } = useToast();

  // Update pending count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: pendingCount });

    try {
      const result = await syncMutations((progress) => {
        setSyncProgress(progress);
      });

      if (result.synced > 0) {
        toast({
          title: '✅ Sync Complete',
          description: `${result.synced} changes synced successfully`,
          variant: 'success'
        });
      }

      if (result.failed > 0) {
        toast({
          title: '⚠️ Sync Incomplete',
          description: `${result.failed} changes failed to sync`,
          variant: 'warning'
        });
      }

      setPendingCount(0);
      if (onSyncComplete) onSyncComplete(result);
    } catch (error) {
      toast({
        title: '❌ Sync Failed',
        description: error.message,
        variant: 'error'
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // CRITICAL FIX: Only show when actually offline OR when syncing
  const shouldShow = !isOnline || isSyncing;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-16 left-0 right-0 z-40 px-4 py-2"
        >
          <div className="max-w-7xl mx-auto">
            {/* Offline Badge */}
            {!isOnline && !isSyncing && (
              <div className="bg-red-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 animate-pulse flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Offline Mode</p>
                    {pendingCount > 0 && (
                      <p className="text-xs opacity-90">
                        {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} queued for sync
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Syncing Progress */}
            {isSyncing && syncProgress && (
              <div className="bg-blue-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Syncing Changes...</p>
                    <p className="text-xs opacity-90">
                      {syncProgress.current} of {syncProgress.total}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Changes Ready to Sync (online but has pending) */}
            {isOnline && pendingCount > 0 && !isSyncing && (
              <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 rounded-lg shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900">
                      {pendingCount} Pending {pendingCount === 1 ? 'Change' : 'Changes'}
                    </p>
                    <p className="text-xs text-slate-600">Ready to sync</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleSync}
                  className="bg-[#3B9FF3] hover:bg-blue-600 text-white flex-shrink-0"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}