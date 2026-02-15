import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Clock In Button with Visual Feedback
 * Shows GPS acquisition progress and success animation
 */
export default function ClockInButton({ 
  onClick, 
  disabled, 
  isLoading,
  language = 'en' 
}) {
  const [gpsProgress, setGpsProgress] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async () => {
    setGpsProgress('acquiring');
    
    try {
      await onClick((status, message) => {
        setGpsProgress(message);
      });
      
      // Success animation
      setGpsProgress(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (error) {
      setGpsProgress(null);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="h-32 w-32 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/50"
          >
            <CheckCircle2 className="w-16 h-16 text-white" />
          </motion.div>
        ) : (
          <Button
            key="button"
            onClick={handleClick}
            size="lg"
            disabled={disabled || isLoading || gpsProgress !== null}
            className="h-32 w-32 rounded-full bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-2xl shadow-blue-500/30 hover:scale-110 transition-all duration-300 disabled:opacity-50"
          >
            {gpsProgress ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <Play className="w-12 h-12" />
            )}
          </Button>
        )}
      </AnimatePresence>

      {/* Status Badge */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        {gpsProgress ? (
          <Badge className="bg-blue-500 text-white font-bold text-xs shadow-lg animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {language === 'es' ? 'GPS...' : 'GPS...'}
          </Badge>
        ) : (
          <Badge className="bg-green-500 text-white font-bold text-xs shadow-lg">
            {language === 'es' ? 'LISTO' : 'READY'}
          </Badge>
        )}
      </div>

      {/* GPS Progress Text */}
      {gpsProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {gpsProgress}
          </p>
        </motion.div>
      )}
    </div>
  );
}