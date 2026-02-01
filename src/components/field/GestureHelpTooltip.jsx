import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GestureHelpTooltip — Shows mobile gesture hints
 * Auto-dismisses after 3 seconds
 * Non-intrusive, bottom-center positioning
 */
export default function GestureHelpTooltip({ isVisible, onDismiss }) {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-xs"
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white text-sm rounded-lg p-3 shadow-lg border border-slate-700">
            <div className="space-y-2">
              <div className="font-semibold">📱 Mobile Gestures</div>
              <ul className="text-xs space-y-1 text-slate-300">
                <li>👉 <strong>Swipe from left edge:</strong> Open search</li>
                <li>👉 <strong>Swipe from right edge:</strong> Close panel</li>
                <li>👉 <strong>Long press:</strong> Dimension menu</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}