import React, { useEffect, useState } from 'react';
import { Check, Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SaveIndicator({ isSaving, lastSaved, isOnline }) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setShowSaved(true);
      // STEP 4: Extended visibility to 5 seconds for clear confirmation
      const timer = setTimeout(() => setShowSaved(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  return (
    <AnimatePresence>
      {(isSaving || showSaved) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span className="text-slate-400">
                {!isOnline ? 'Saving locally...' : 'Saving...'}
              </span>
            </>
          ) : showSaved ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              {/* STEP 4: Larger, clearer success message with explicit completion */}
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                {!isOnline ? '✓ Saved locally — will sync when online' : '✓ Saved to cloud'}
              </span>
              {!isOnline && (
                <WifiOff className="w-4 h-4 text-amber-500" />
              )}
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}