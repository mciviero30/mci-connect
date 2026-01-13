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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-2 right-2 z-40 flex items-center gap-2"
    >
        {/* Compact Focus Indicator - Desktop */}
        {!isMobile && (
          <div className="flex items-center gap-2 bg-purple-600/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-purple-400/50">
            <Maximize2 className="w-3 h-3 text-white" />
            <span className="text-xs font-medium text-white">Focus</span>
            <button
              onClick={onExit}
              className="ml-1 text-white/70 hover:text-white transition-colors"
              title="Exit (ESC)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile: Exit Button */}
        {isMobile && (
          <Button
            onClick={onExit}
            size="sm"
            className="bg-purple-600/90 hover:bg-purple-700 text-white border border-purple-400/50 shadow-lg backdrop-blur-sm px-3 py-1.5 h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Exit
          </Button>
        )}
    </motion.div>
  );
}