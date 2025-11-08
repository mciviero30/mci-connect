/**
 * Prompt #85: Offline Indicator UI Component
 * Shows offline badge and sync progress
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPendingCount, syncMutations, clearFailedMutations } from './mutationQueue';
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
    const interval = setInterval(updateCount, 5000); // Check every 5 seconds

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

  const handleClearFailed = async () => {
    const cleared = await clearFailedMutations();
    toast({
      title: '🗑️ Cleared Failed Mutations',
      description: `Removed ${cleared} failed changes`,
      variant: 'info'
    });
    const count = await getPendingCount();
    setPendingCount(count);
  };

  // FIXED: Don't show anything if online and no pending changes OR if syncing just completed
  if ((isOnline && pendingCount === 0) || (isOnline && !isSyncing && pendingCount === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* Only show if offline OR if there are pending changes OR if currently syncing */}
      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          {/* Offline Badge */}
          {!isOnline && (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 mb-2"
            >
              <WifiOff className="w-5 h-5 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-sm">Offline Mode</p>
                <p className="text-xs opacity-90">
                  {pendingCount > 0 
                    ? `${pendingCount} changes queued for sync` 
                    : 'Changes will sync when online'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Syncing Progress */}
          {isSyncing && syncProgress && (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-blue-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 mb-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex-1">
                <p className="font-bold text-sm">Syncing Changes...</p>
                <p className="text-xs opacity-90">
                  {syncProgress.current} / {syncProgress.total}
                </p>
              </div>
            </motion.div>
          )}

          {/* Pending Changes Badge (when online) - Only show if not syncing */}
          {isOnline && pendingCount > 0 && !isSyncing && (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white border-2 border-amber-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900">
                  {pendingCount} Pending Changes
                </p>
                <p className="text-xs text-slate-600">Ready to sync</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSync}
                  className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sync
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}