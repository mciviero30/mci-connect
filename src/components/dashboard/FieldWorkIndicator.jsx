import React, { useState, useEffect } from 'react';
import { MapPin, ArrowRight, FileText, CheckSquare, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { FieldSessionManager } from '@/components/field/services/FieldSessionManager';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

/**
 * FIELD WORK INDICATOR - INTELLIGENT RE-ENTRY
 * 
 * Shows pending Field work with full context restoration
 * - Detects active session from FieldSessionManager
 * - Shows job name, panel, drafts, pending actions
 * - Links directly to project with state restoration
 * - Does NOT block navigation or show modals
 */
export default function FieldWorkIndicator() {
  const [sessionInfo, setSessionInfo] = useState(null);
  const { language } = useLanguage();

  // Fetch job name if we have jobId
  const { data: job } = useQuery({
    queryKey: ['field-session-job', sessionInfo?.jobId],
    queryFn: () => base44.entities.Job.filter({ id: sessionInfo.jobId }).then(jobs => jobs[0]),
    enabled: !!sessionInfo?.jobId,
    staleTime: 300000,
  });

  useEffect(() => {
    const checkSession = () => {
      try {
        const session = FieldSessionManager.getSession();
        
        if (!session || !session.isActive) {
          setSessionInfo(null);
          return;
        }

        // Extract meaningful session info
        const info = {
          jobId: session.jobId,
          activePanel: session.context?.activePanel || 'overview',
          hasActiveIntent: !!session.activeIntent,
          activeIntentType: session.activeIntent?.type,
          draftCount: session.unsavedWork?.drafts?.length || 0,
          pendingActionsCount: session.unsavedWork?.pendingActions?.length || 0,
          openModals: session.context?.openModals || [],
          lastActiveAt: session.lastActiveAt,
          selectedPlanId: session.context?.selectedPlanId,
        };

        setSessionInfo(info);
      } catch (error) {
        console.error('Error checking Field session:', error);
        setSessionInfo(null);
      }
    };

    checkSession();
    
    // Check every 3 seconds (passive polling)
    const interval = setInterval(checkSession, 3000);
    
    return () => clearInterval(interval);
  }, []);

  if (!sessionInfo) return null;

  // Build smart resume URL with state restoration params
  const buildResumeURL = () => {
    if (!sessionInfo.jobId) return createPageUrl('Field');
    
    const params = new URLSearchParams({
      id: sessionInfo.jobId,
      panel: sessionInfo.activePanel,
    });

    if (sessionInfo.selectedPlanId) {
      params.append('plan', sessionInfo.selectedPlanId);
    }

    return `${createPageUrl('FieldProject')}?${params.toString()}`;
  };

  const resumeURL = buildResumeURL();
  const jobName = job?.name || (language === 'es' ? 'Proyecto activo' : 'Active project');

  // Calculate session age
  const sessionAge = sessionInfo.lastActiveAt 
    ? Math.floor((Date.now() - sessionInfo.lastActiveAt) / 60000) 
    : 0;

  // Show only if recent (< 4 hours) or has unsaved work
  const hasUnsavedWork = sessionInfo.draftCount > 0 || sessionInfo.pendingActionsCount > 0 || sessionInfo.hasActiveIntent;
  const isRecent = sessionAge < 240; // 4 hours

  if (!hasUnsavedWork && !isRecent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="mb-6"
      >
        <Link to={resumeURL}>
          <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 radius-md shadow-enterprise-sm hover:shadow-enterprise-md transition-all cursor-pointer group spacing-md">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF8C00] to-[#FFB347] flex items-center justify-center shadow-sm flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {language === 'es' ? 'Trabajo pendiente en Field' : 'Unfinished Field work'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {jobName}
                  {hasUnsavedWork && (
                    <span className="ml-2 text-orange-700 dark:text-orange-400 font-medium">
                      • {language === 'es' ? 'Cambios sin guardar' : 'Unsaved changes'}
                    </span>
                  )}
                </p>
              </div>

              {/* Action */}
              <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
                <span className="text-xs font-bold">
                  {language === 'es' ? 'Continuar' : 'Resume'}
                </span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}