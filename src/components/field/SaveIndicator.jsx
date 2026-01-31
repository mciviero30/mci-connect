import React, { useEffect, useState } from 'react';
import { Check, Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SaveIndicator({ isSaving, lastSaved, isOnline }) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setShowSaved(true);
      // QW3: Extended visibility to 5 seconds for worker confidence
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
              <Check className="w-3 h-3 text-green-500" />
              {/* QW2: EXPLICIT offline save confirmation */}
              <span className="text-green-500 font-semibold">
                {!isOnline ? 'Saved locally — will sync when online' : 'Saved'}
              </span>
              {!isOnline && (
                <WifiOff className="w-3 h-3 text-amber-500" />
              )}
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}