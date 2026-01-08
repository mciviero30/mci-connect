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
    },
    offline: {
      icon: CloudOff,
      color: 'from-amber-600 to-orange-600',
      text: message || 'Queued offline',
    },
    error: {
      icon: AlertCircle,
      color: 'from-red-600 to-rose-600',
      text: message || 'Save failed',
    },
  };

  const { icon: Icon, color, text } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-sm">{text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}