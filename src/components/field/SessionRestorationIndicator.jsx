import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SessionRestorationIndicator - Shows when session is being restored
 * CRITICAL: User knows app is recovering their work context
 */
export default function SessionRestorationIndicator({ isRestoring, restoredContext }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let hideTimer = null;
    if (isRestoring) {
      setShow(true);
    } else if (restoredContext) {
      // Show "restored" state briefly, then fade
      hideTimer = setTimeout(() => setShow(false), 2000);
    }
    return () => { if (hideTimer) clearTimeout(hideTimer); };
  }, [isRestoring, restoredContext]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-2 shadow-2xl"
      >
        {isRestoring ? (
          <div className="flex items-center gap-2 text-white text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-[#FFB800]" />
            <span>Restoring session...</span>
          </div>
        ) : restoredContext ? (
          <div className="flex items-center gap-2 text-white text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>Session restored</span>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}