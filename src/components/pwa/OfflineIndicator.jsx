import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncQueue } from './SyncQueueManager';
import ConflictResolutionDialog from '../field/ConflictResolutionDialog';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  const [showConflicts, setShowConflicts] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const { pendingCount, isSyncing, conflicts, clearConflicts } = useSyncQueue();
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // Show "synced" confirmation briefly when online
      if (pendingCount === 0) {
        setJustSynced(true);
        setTimeout(() => {
          setJustSynced(false);
          setShowIndicator(false);
        }, 2500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
      setJustSynced(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount]);

  // QW3: Keep "all synced" visible for 5 seconds (was 2.5s)
  useEffect(() => {
    if (justSynced) {
      const timer = setTimeout(() => {
        setJustSynced(false);
        setShowIndicator(false);
      }, 5000); // EXTENDED: 5 seconds for worker confidence
      return () => clearTimeout(timer);
    }
  }, [justSynced]);

  // Auto-hide when sync completes (non-justSynced case)
  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount === 0 && showIndicator && !justSynced) {
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 5000); // EXTENDED: 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, showIndicator, justSynced]);

  // Show conflicts button if any
  const hasConflicts = conflicts && conflicts.length > 0;

  // QW1: CRITICAL - ALWAYS show when offline (not just when pending)
  // Worker MUST know they are offline immediately
  const shouldShow = !isOnline || showIndicator || hasConflicts;

  if (!shouldShow && isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Conflicts Alert - Fixed position */}
      {hasConflicts && (
        <div className="fixed bottom-24 md:bottom-20 right-4 z-[60]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 radius-md shadow-enterprise-lg bg-red-600 text-white cursor-pointer hover:shadow-enterprise-xl transition-all"
            onClick={() => setShowConflicts(true)}
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-xs font-bold">
              {language === 'es' ? 'Revisar conflictos' : 'Review conflicts'}
            </span>
          </motion.div>
        </div>
      )}

      {/* Micro-Feedback: Minimal, Silent, Clear */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-[60] pointer-events-none"
          >
            <div className={`radius-md shadow-enterprise-lg backdrop-blur-md border-2 overflow-hidden ${
              justSynced || (isOnline && pendingCount === 0)
                ? 'bg-green-50/95 dark:bg-green-900/95 border-green-300 dark:border-green-700'
                : isOnline && pendingCount > 0
                ? 'bg-blue-50/95 dark:bg-blue-900/95 border-blue-300 dark:border-blue-700'
                : 'bg-amber-50/95 dark:bg-amber-900/95 border-amber-300 dark:border-amber-700'
            }`}>
              <div className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    justSynced || (isOnline && pendingCount === 0)
                      ? 'bg-green-600'
                      : isOnline && pendingCount > 0
                      ? 'bg-blue-600'
                      : 'bg-amber-600'
                  }`}>
                    {justSynced || (isOnline && pendingCount === 0) ? (
                      <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : isOnline && pendingCount > 0 ? (
                      <Wifi className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : (
                      <WifiOff className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                  </div>

                  <span className={`text-xs font-bold ${
                    justSynced || (isOnline && pendingCount === 0)
                      ? 'text-green-900 dark:text-green-100'
                      : isOnline && pendingCount > 0
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-amber-900 dark:text-amber-100'
                  }`}>
                    {justSynced
                      ? (language === 'es' ? '✓ Todo guardado' : '✓ All saved')
                      : isOnline && pendingCount === 0
                      ? (language === 'es' ? '✓ Sincronizado' : '✓ Synced')
                      : isOnline && pendingCount > 0
                      ? (language === 'es' ? `Guardando ${pendingCount}` : `Saving ${pendingCount}`)
                      : (language === 'es' ? '⚠️ Trabajando offline' : '⚠️ Working offline')
                    }
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        conflicts={conflicts}
        open={showConflicts}
        onOpenChange={setShowConflicts}
        onResolve={(resolutions) => {
          clearConflicts();
        }}
      />
    </>
  );
}

// Lightweight version for inline feedback (no modal overlay)
export function InlineSaveFeedback({ status }) {
  if (status === 'idle') return null;

  const config = {
    saving: { icon: Cloud, color: 'text-blue-600', text: 'Saving' },
    saved: { icon: CheckCircle2, color: 'text-green-600', text: 'Saved' },
    offline: { icon: CloudOff, color: 'text-amber-600', text: 'Queued' },
    error: { icon: AlertCircle, color: 'text-red-600', text: 'Error' },
  };

  const { icon: Icon, color, text } = config[status] || config.saved;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color} ${status === 'saving' ? 'animate-spin' : ''}`} strokeWidth={2.5} />
      <span className={`text-xs font-semibold ${color}`}>{text}</span>
    </div>
  );
}