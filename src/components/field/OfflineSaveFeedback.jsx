import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, Check } from 'lucide-react';

/**
 * QW6 FIX: Offline Save Visual Feedback
 * Shows when data is saved locally (not synced to cloud)
 * Gives workers confidence that data is safe even offline
 */
export default function OfflineSaveFeedback({ trigger, message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="fixed bottom-32 md:bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 border-2 border-orange-500 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[200px]"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-4 h-4 text-orange-400" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-400" />
              Saved Locally
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {message || 'Will sync when online'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}