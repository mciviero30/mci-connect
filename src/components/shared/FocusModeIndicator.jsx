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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2"
    >
        {/* Focus Mode Indicator Badge */}
        <Badge className="bg-purple-600 text-white border-purple-400 px-3 py-1.5 shadow-lg">
          <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
          Focus Mode Active
        </Badge>

        {/* Exit Button - Mobile */}
        {isMobile && (
          <Button
            onClick={onExit}
            size="sm"
            className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-xl backdrop-blur-sm min-h-[44px] px-4"
          >
            <X className="w-4 h-4 mr-2" />
            Exit Focus Mode
          </Button>
        )}

        {/* Desktop: ESC hint */}
        {!isMobile && (
          <p className="text-xs text-slate-400 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-700">
            Press <kbd className="bg-slate-700 px-2 py-0.5 rounded text-white font-mono">ESC</kbd> to exit
          </p>
        )}
    </motion.div>
  );
}