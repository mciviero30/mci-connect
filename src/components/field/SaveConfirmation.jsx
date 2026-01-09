import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Cloud, CloudOff, AlertCircle } from 'lucide-react';

/**
 * SaveConfirmation - Calm, non-intrusive save feedback
 * 
 * CRITICAL: User must know save succeeded WITHOUT UI clutter
 * - Brief (2s max)
 * - Clear (checkmark + text)
 * - Calm (no flashing, no blocking)
 * - Informative (online vs offline)
 */
export default function SaveConfirmation({ 
  show, 
  type = 'success', // success | offline | error
  message,
  onComplete 
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onComplete?.(), 300); // Wait for animation
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const config = {
    success: {
      icon: CheckCircle2,
      color: 'from-green-600 to-emerald-600',
      text: message || 'Saved',
      userText: message || '✓ Saved'
    },
    offline: {
      icon: CloudOff,
      color: 'from-amber-600 to-orange-600',
      text: message || 'Queued offline',
      userText: message || 'Saved locally'
    },
    error: {
      icon: AlertCircle,
      color: 'from-red-600 to-rose-600',
      text: message || 'Save failed',
      userText: message || 'Not saved'
    },
  };

  const { icon: Icon, color, userText } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -5 }}
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