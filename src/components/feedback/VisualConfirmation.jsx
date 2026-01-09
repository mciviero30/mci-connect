import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VISUAL CONFIRMATION - Micro-feedback NO bloqueante
 * 
 * Aparece brevemente, no interrumpe flujo
 * Posicionamiento: esquina inferior derecha (no bloquea contenido)
 */
export const VisualConfirmation = ({ show, type = 'success', message, duration = 1500, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  const configs = {
    success: {
      bg: 'bg-green-600',
      icon: <Check className="w-5 h-5 text-white" />,
      defaultMessage: 'Saved',
    },
    error: {
      bg: 'bg-red-600',
      icon: <X className="w-5 h-5 text-white" />,
      defaultMessage: 'Failed',
    },
    offline: {
      bg: 'bg-orange-600',
      icon: <WifiOff className="w-5 h-5 text-white" />,
      defaultMessage: 'Saved offline',
    },
    syncing: {
      bg: 'bg-blue-600',
      icon: <Loader2 className="w-5 h-5 text-white animate-spin" />,
      defaultMessage: 'Syncing...',
    },
  };

  const config = configs[type] || configs.success;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`fixed bottom-24 right-4 z-[100] ${config.bg} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-none`}
        >
          {config.icon}
          <span className="font-semibold text-sm">
            {message || config.defaultMessage}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Inline badge for items being synced
export const SyncingBadge = ({ show = true }) => {
  if (!show) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded text-[9px] font-bold uppercase tracking-wide animate-pulse">
      <Loader2 className="w-2.5 h-2.5 animate-spin" />
      Syncing
    </span>
  );
};

// Offline badge for queued items
export const OfflineBadge = ({ count }) => {
  if (!count || count === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white rounded-full text-[10px] font-bold shadow-lg">
      <WifiOff className="w-2.5 h-2.5" />
      {count} pending
    </span>
  );
};

// Success checkmark that appears briefly
export const CheckmarkFlash = ({ show, onComplete, duration = 1000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg pointer-events-none z-10"
        >
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-xl">
            <Check className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};