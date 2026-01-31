/**
 * QW6: Conflict Alert Banner
 * 
 * CRITICAL: Surface conflicts visibly, never resolve silently
 * Worker MUST know when attention is needed
 */

import React from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ConflictAlertBanner({ conflictCount, onReview }) {
  if (conflictCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-md w-full mx-4"
    >
      <div className="bg-red-600 text-white rounded-xl shadow-2xl p-4 border-2 border-red-400">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base mb-1">
              ⚠️ {conflictCount} Conflict{conflictCount > 1 ? 's' : ''} Detected
            </p>
            <p className="text-xs text-red-100 mb-3">
              Changes made offline conflict with server data. Review required.
            </p>
            <Button
              onClick={onReview}
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50 font-bold"
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Conflicts Now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}