import React, { useState, useEffect } from 'react';
import { WifiOff, CloudOff, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function FieldStatusBar({ jobId }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Monitor online status
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

  // Check for unsynced changes in localStorage
  useEffect(() => {
    const checkUnsyncedChanges = () => {
      try {
        const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        setUnsyncedCount(syncQueue.length);
      } catch {
        setUnsyncedCount(0);
      }
    };

    checkUnsyncedChanges();
    const interval = setInterval(checkUnsyncedChanges, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch blocking incidents
  const { data: blockingIncidents = [] } = useQuery({
    queryKey: ['blocking-incidents', jobId],
    queryFn: () => base44.entities.SafetyIncident.filter({
      job_id: jobId,
      severity: 'critical',
      status: 'open'
    }),
    enabled: !!jobId,
    refetchInterval: 30000, // Refresh every 30s
  });

  const hasIssues = !isOnline || unsyncedCount > 0 || blockingIncidents.length > 0;

  if (!hasIssues) return null;

  return (
    <div className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3 flex-wrap shadow-lg">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-bold">Offline Mode</span>
        </div>
      )}

      {/* Unsynced Changes */}
      {unsyncedCount > 0 && (
        <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/30">
          <CloudOff className="w-4 h-4" />
          <span className="text-xs font-bold">{unsyncedCount} Unsynced</span>
        </div>
      )}

      {/* Blocking Incidents */}
      {blockingIncidents.length > 0 && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-bold">{blockingIncidents.length} Critical Issue{blockingIncidents.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}