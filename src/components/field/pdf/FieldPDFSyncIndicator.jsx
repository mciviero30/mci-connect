import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CloudUpload, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { getPendingPDFJobs } from './FieldPDFQueue';
import { syncOfflinePDFs, subscribePDFSync } from './FieldPDFOfflineSync';
import { base44 } from '@/api/base44Client';

export default function FieldPDFSyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  
  // Load pending count
  useEffect(() => {
    loadPendingCount();
  }, []);
  
  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = subscribePDFSync(setSyncStatus);
    return unsubscribe;
  }, []);
  
  const loadPendingCount = async () => {
    try {
      const pending = await getPendingPDFJobs();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Failed to load pending PDFs:', error);
    }
  };
  
  const handleSync = async () => {
    try {
      const result = await syncOfflinePDFs(base44);
      
      setLastSync({
        synced: result.synced,
        failed: result.failed,
        timestamp: Date.now()
      });
      
      await loadPendingCount();
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };
  
  if (pendingCount === 0) {
    return null;
  }
  
  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CloudUpload className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-orange-900 dark:text-orange-100">
            {pendingCount} PDF{pendingCount !== 1 ? 's' : ''} pending sync
          </span>
          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
            Generated offline - will sync when online
          </p>
        </div>
        
        {navigator.onLine && (
          <Button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {syncStatus === 'syncing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        )}
      </AlertDescription>
      
      {lastSync && (
        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
          Last sync: {lastSync.synced} succeeded, {lastSync.failed} failed
        </div>
      )}
    </Alert>
  );
}