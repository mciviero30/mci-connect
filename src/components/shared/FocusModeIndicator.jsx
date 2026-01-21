import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function FocusModeIndicator({ isActive, onExit }) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Desktop: ESC key to exit
  useEffect(() => {
    if (!isActive || isMobile) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isMobile, onExit]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-2 right-2 z-40 pointer-events-none"
    >
        {/* Ultra-compact indicator */}
        <button
          onClick={onExit}
          className="w-7 h-7 bg-purple-600/80 hover:bg-purple-700 backdrop-blur-sm rounded-md shadow-md border border-purple-400/30 flex items-center justify-center transition-all pointer-events-auto"
          title="Exit Focus Mode (ESC)"
        >
          <Maximize2 className="w-3 h-3 text-white" />
        </button>
    </motion.div>
  );
}