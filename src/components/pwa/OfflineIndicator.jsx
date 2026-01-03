import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncQueue } from './SyncQueueManager';
import ConflictResolutionDialog from '../field/ConflictResolutionDialog';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  const [showConflicts, setShowConflicts] = useState(false);
  const { pendingCount, isSyncing, conflicts, syncNow, clearConflicts } = useSyncQueue();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show conflicts button if any
  const hasConflicts = conflicts && conflicts.length > 0;

  if (!showIndicator && isOnline && pendingCount === 0 && !hasConflicts) {
    return null;
  }

  return (
    <>
      {/* Conflicts Alert - Fixed position */}
      {hasConflicts && (
        <div className="fixed bottom-24 md:bottom-20 right-4 z-[9999]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-xl bg-gradient-to-r from-red-500 to-red-600 text-white cursor-pointer hover:shadow-2xl transition-all"
            onClick={() => setShowConflicts(true)}
          >
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-bold">{conflicts.length} Conflict(s)</span>
          </motion.div>
        </div>
      )}

      {/* Sync Status Banner */}
      <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      >
        <div className="px-safe pt-safe">
          <div className={`mx-4 mt-4 rounded-2xl shadow-2xl backdrop-blur-xl border-2 overflow-hidden pointer-events-auto ${
            isOnline 
              ? 'bg-green-50/95 border-green-300 dark:bg-green-900/95 dark:border-green-700' 
              : 'bg-amber-50/95 border-amber-300 dark:bg-amber-900/95 dark:border-amber-700'
          }`}>
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  isOnline 
                    ? 'bg-green-100 dark:bg-green-800' 
                    : 'bg-amber-100 dark:bg-amber-800'
                }`}>
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-700 dark:text-green-300" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${
                    isOnline 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-amber-900 dark:text-amber-100'
                  }`}>
                    {isOnline ? '✅ Conexión restaurada' : '⚠️ Sin conexión'}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    isOnline 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {isOnline 
                      ? pendingCount > 0 
                        ? `Sincronizando ${pendingCount} cambios...` 
                        : 'Todos los cambios sincronizados'
                      : 'Los cambios se guardarán localmente'
                    }
                  </p>
                </div>

                {isOnline && pendingCount > 0 && (
                  <button
                    onClick={syncNow}
                    disabled={isSyncing}
                    className="p-2 rounded-xl bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-green-700 dark:text-green-300 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {!isOnline && pendingCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-200 dark:bg-amber-800">
                    <CloudOff className="w-3.5 h-3.5 text-amber-800 dark:text-amber-200" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-100">
                      {pendingCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar for syncing */}
            {isSyncing && (
              <div className="h-1 bg-green-200 dark:bg-green-800 overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        conflicts={conflicts}
        open={showConflicts}
        onOpenChange={setShowConflicts}
        onResolve={(resolutions) => {
          console.log('Manual conflict resolution:', resolutions);
          clearConflicts();
        }}
      />
    </>
  );
}