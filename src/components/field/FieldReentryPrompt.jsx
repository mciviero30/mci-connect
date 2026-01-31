import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, RotateCcw, Sparkles, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/i18n/LanguageContext';

/**
 * FIELD RE-ENTRY PROMPT - Smart Session Restoration
 * 
 * Shows ONLY when user manually enters Field with active session
 * Offers: Resume (restore full context) or Start Fresh (new session)
 * NOT a modal - lightweight overlay, dismissible, non-blocking
 */
export default function FieldReentryPrompt({ 
  session, 
  jobName, 
  onResume, 
  onStartFresh 
}) {
  const { language } = useLanguage();

  if (!session) return null;

  const sessionAgeMinutes = session.lastActiveAt 
    ? Math.floor((Date.now() - session.lastActiveAt) / 60000) 
    : 0;

  const sessionAgeHours = Math.floor(sessionAgeMinutes / 60);
  
  // STEP 1: Session age warning threshold (12 hours)
  const isStaleSession = sessionAgeHours >= 12;

  const draftCount = session.unsavedWork?.drafts?.length || 0;
  const hasActiveIntent = !!session.activeIntent;
  const activePanel = session.context?.activePanel || 'overview';

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-800 radius-lg shadow-enterprise-xl border-2 border-blue-200 dark:border-blue-700 max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] flex items-center justify-center shadow-md">
              <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'es' ? '¿Continuar donde lo dejaste?' : 'Resume where you left off?'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {language === 'es' ? 'Sesión anterior detectada' : 'Previous session found'}
              </p>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="px-6 py-4 space-y-3">
          <div className="bg-slate-50 dark:bg-slate-900/50 radius-sm spacing-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Proyecto' : 'Project'}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {jobName}
                </p>
              </div>
            </div>

            {/* Session Details */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {activePanel !== 'overview' && (
                <Badge className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-[10px]">
                  {activePanel}
                </Badge>
              )}
              {draftCount > 0 && (
                <Badge className="bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-[10px]">
                  {draftCount} {language === 'es' ? 'borrador' + (draftCount > 1 ? 'es' : '') : 'draft' + (draftCount > 1 ? 's' : '')}
                </Badge>
              )}
              {hasActiveIntent && (
                <Badge className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-[10px] flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {language === 'es' ? 'En progreso' : 'In progress'}
                </Badge>
              )}
              {/* STEP 1: Show age badge with warning styling if stale */}
              {sessionAgeMinutes >= 60 && (
                <Badge className={`text-[10px] flex items-center gap-1 ${
                  isStaleSession
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <Clock className="w-3 h-3" />
                  {sessionAgeHours}h {language === 'es' ? 'atrás' : 'ago'}
                </Badge>
              )}
            </div>
          </div>

          {/* STEP 1: STALE SESSION WARNING - Prominent visual alert */}
          {isStaleSession && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 radius-sm shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5 animate-pulse" strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-900 dark:text-red-200 mb-1">
                  {language === 'es' 
                    ? '⚠️ Sesión antigua detectada' 
                    : '⚠️ Old Session Detected'}
                </p>
                <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                  {language === 'es' 
                    ? `Esta sesión tiene más de ${sessionAgeHours} horas. Las condiciones del trabajo pueden haber cambiado.` 
                    : `This session is over ${sessionAgeHours} hours old. Job conditions may have changed.`}
                </p>
              </div>
            </div>
          )}

          {/* Warning if unsaved work */}
          {(draftCount > 0 || hasActiveIntent) && !isStaleSession && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 radius-sm">
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {language === 'es' 
                  ? 'Tienes cambios sin completar. Te recomendamos continuar para no perder progreso.' 
                  : 'You have unfinished work. We recommend resuming to keep your progress.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          {/* STEP 1: Adjust CTA text for stale sessions - still allow resume */}
          <Button
            onClick={onResume}
            className={`w-full justify-between group ${
              isStaleSession 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'btn-primary'
            }`}
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
              {isStaleSession 
                ? (language === 'es' ? 'Continuar de todas formas' : 'Resume anyway')
                : (language === 'es' ? 'Continuar donde lo dejé' : 'Resume where I left off')
              }
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
          </Button>

          {/* STEP 1: Recommend "Start Fresh" for stale sessions */}
          <Button
            onClick={onStartFresh}
            variant="outline"
            className={`w-full btn-secondary ${
              isStaleSession
                ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 mr-2" strokeWidth={2.5} />
            {isStaleSession
              ? (language === 'es' ? '✓ Empezar sesión nueva (recomendado)' : '✓ Start new session (recommended)')
              : (language === 'es' ? 'Empezar desde cero' : 'Start fresh')
            }
          </Button>
          
          {/* STEP 1: Explanation for stale sessions */}
          {isStaleSession && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-1 px-2">
              {language === 'es' 
                ? 'Una sesión nueva evitará confusión con datos desactualizados' 
                : 'Starting fresh prevents confusion with outdated context'}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}