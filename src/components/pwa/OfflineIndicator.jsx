import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncQueue } from './SyncQueueManager';
import ConflictResolutionDialog from '../field/ConflictResolutionDialog';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  const [showConflicts, setShowConflicts] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const { pendingCount, isSyncing, conflicts, syncNow, clearConflicts } = useSyncQueue();
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

  // Auto-hide when sync completes
  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount === 0 && showIndicator && !justSynced) {
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, showIndicator, justSynced]);

  const config = {
    success: {
      icon: CheckCircle2,
      color: 'from-green-600 to-emerald-600',
      userText: '✓ Saved'
    },
    offline: {
      icon: CloudOff,
      color: 'from-amber-600 to-orange-600',
      userText: 'Saved locally'
    },
    error: {
      icon: AlertCircle,
      color: 'from-red-600 to-rose-600',
      userText: 'Not saved'
    },
  };

  const { icon: Icon, color, userText } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-slate-900/95 backdrop-blur-md border border-slate-700/50 radius-md shadow-enterprise-xl px-4 py-2.5"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
            <span className="text-white font-semibold text-sm">{userText}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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