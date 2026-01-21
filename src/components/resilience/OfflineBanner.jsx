import React, { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Non-intrusive offline indicator banner
 * Shows when device goes offline, hides when back online
 * Does NOT block navigation or user actions
 */
export default function OfflineBanner({ language = 'en' }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Auto-hide reconnected message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4" />
              <p className="text-sm font-medium">
                {language === 'es' 
                  ? 'Sin conexión • Los cambios se guardarán cuando vuelvas online' 
                  : 'Offline • Changes will sync when back online'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {showReconnected && isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
              <Wifi className="w-4 h-4" />
              <p className="text-sm font-medium">
                {language === 'es' 
                  ? '¡Reconectado! Sincronizando...' 
                  : 'Back online! Syncing...'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}