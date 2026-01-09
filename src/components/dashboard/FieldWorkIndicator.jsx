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
  const jobName = job?.name || sessionInfo.jobName || (language === 'es' ? 'Proyecto en curso' : 'Project in progress');

  // Calculate session age
  const sessionAge = sessionInfo.lastActiveAt 
    ? Math.floor((Date.now() - sessionInfo.lastActiveAt) / 60000) 
    : 0;

  // Active intent icon
  const getIntentIcon = () => {
    if (sessionInfo.activeIntentType === 'creating_task') return CheckSquare;
    if (sessionInfo.activeIntentType === 'measuring_dimension') return MapPin;
    if (sessionInfo.activeIntentType === 'recording_audio') return FileText;
    return null;
  };

  const IntentIcon = getIntentIcon();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <Link to={resumeURL}>
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              {/* Icon - MCI Field Orange */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] flex items-center justify-center shadow-md flex-shrink-0 relative">
                <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
                {IntentIcon && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <IntentIcon className="w-3 h-3 text-orange-600" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'es' ? 'Reanudar sesión de Field' : 'Resume last Field session'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {jobName}
                  </p>
                  {sessionInfo.activePanel !== 'overview' && (
                    <Badge className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-[10px] px-2 py-0">
                      {sessionInfo.activePanel}
                    </Badge>
                  )}
                  {sessionInfo.draftCount > 0 && (
                    <Badge className="bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-[10px] px-2 py-0">
                      {sessionInfo.draftCount} {language === 'es' ? 'borrador' + (sessionInfo.draftCount > 1 ? 'es' : '') : 'draft' + (sessionInfo.draftCount > 1 ? 's' : '')}
                    </Badge>
                  )}
                  {sessionAge < 60 && (
                    <Badge className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-[10px] px-2 py-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sessionAge}m {language === 'es' ? 'atrás' : 'ago'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
                <span className="text-sm font-semibold hidden sm:inline">
                  {language === 'es' ? 'Reanudar' : 'Resume'}
                </span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>

            {/* Active Intent Notice */}
            {sessionInfo.hasActiveIntent && (
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-xs text-orange-900 dark:text-orange-300 font-semibold">
                  {language === 'es' 
                    ? 'Acción en progreso - no completada' 
                    : 'Action in progress - not completed'}
                </p>
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}