import React, { useState, useEffect } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';

/**
 * FIELD WORK INDICATOR
 * 
 * Non-intrusive reminder that user has unfinished Field work
 * - Does NOT block navigation
 * - Does NOT show modals
 * - Does NOT change Field logic
 * - Respects visual hierarchy (SECONDARY level)
 */
export default function FieldWorkIndicator() {
  const [pendingSession, setPendingSession] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    // Check for active Field session in sessionStorage
    const checkPendingWork = () => {
      try {
        // Check FieldSessionManager keys
        const sessionKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('field_session_') || 
          key.startsWith('field_draft_') ||
          key === 'field_active'
        );

        if (sessionKeys.length > 0) {
          // Try to get the most recent session info
          for (const key of sessionKeys) {
            const data = sessionStorage.getItem(key);
            if (data && data !== 'true') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.jobId || parsed.projectId || parsed.job_id) {
                  setPendingSession({
                    jobId: parsed.jobId || parsed.projectId || parsed.job_id,
                    jobName: parsed.jobName || parsed.projectName || 'Unknown Project',
                    timestamp: parsed.timestamp || Date.now(),
                  });
                  return;
                }
              } catch {
                // Not JSON, might be flag
              }
            }
          }
          
          // If we found field_active flag but no parsed data, just indicate work in progress
          if (sessionStorage.getItem('field_active') === 'true') {
            setPendingSession({
              jobName: 'In Progress',
              timestamp: Date.now(),
            });
          }
        } else {
          setPendingSession(null);
        }
      } catch (error) {
        console.error('Error checking Field session:', error);
        setPendingSession(null);
      }
    };

    checkPendingWork();
    
    // Check every 5 seconds (passive polling)
    const interval = setInterval(checkPendingWork, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!pendingSession) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <Link to={createPageUrl('Field')}>
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] flex items-center justify-center shadow-md flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'es' ? 'Tienes trabajo pendiente en Field' : 'You have unfinished Field work'}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {pendingSession.jobName}
                </p>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
                <span className="text-sm font-semibold hidden sm:inline">
                  {language === 'es' ? 'Reanudar' : 'Resume'}
                </span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}