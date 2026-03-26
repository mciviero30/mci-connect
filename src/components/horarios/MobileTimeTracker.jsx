import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, MapPin, Play, Square, Coffee, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * I4 - Mobile-Optimized Time Tracking Widget
 * Large touch targets, simplified UI for field workers
 * Replaces LiveTimeTracker on mobile devices
 */

export default function MobileTimeTracker({ 
  jobs, 
  activeSession, 
  onCheckIn, 
  onCheckOut, 
  onBreakStart, 
  onBreakEnd,
  isLoading 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (activeSession?.startTime) {
        const elapsed = Date.now() - activeSession.startTime;
        setElapsedTime(Math.floor(elapsed / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isOnBreak = activeSession?.breaks?.some(b => b.start_time && !b.end_time);

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl border-none overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Current Time Display */}
        <div className="text-center">
          <p className="text-sm opacity-90 mb-1">Current Time</p>
          <p className="text-4xl font-bold tabular-nums">
            {format(currentTime, 'HH:mm')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!activeSession ? (
            <motion.div
              key="clocked-out"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <p className="text-center text-sm opacity-90">Ready to start your day?</p>
              <Button
                onClick={onCheckIn}
                disabled={isLoading}
                className="w-full h-16 text-lg font-bold bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Clock In
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="clocked-in"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Elapsed Time */}
              <div className="text-center bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Time Worked Today</p>
                <p className="text-5xl font-bold tabular-nums tracking-tight">
                  {formatElapsed(elapsedTime)}
                </p>
              </div>

              {/* Current Job */}
              {activeSession.selectedJob && (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs opacity-75">Working on</p>
                    <p className="font-semibold truncate">{activeSession.selectedJob.name}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {!isOnBreak ? (
                  <>
                    <Button
                      onClick={onBreakStart}
                      className="h-14 bg-white/20 hover:bg-white/30 text-white border-2 border-white/40"
                    >
                      <Coffee className="w-5 h-5 mr-2" />
                      Start Break
                    </Button>
                    <Button
                      onClick={onCheckOut}
                      disabled={isLoading}
                      className="h-14 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Clock Out
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={onBreakEnd}
                    className="col-span-2 h-14 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    End Break
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}