import React, { useState } from 'react';
import { Camera, Mic, CheckSquare, Ruler, AlertTriangle } from 'lucide-react';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import DimensionBottomSheet from './DimensionBottomSheet';
import IncidentBottomSheet from './IncidentBottomSheet';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { haptic } from '@/components/feedback/HapticFeedback';
import { microToast } from '@/components/feedback/MicroToast';
import { DisabledButton, validationRules } from '@/components/validation/PreventiveValidation';
import { OfflineStatusBadge } from './FieldOfflineManager';
import { canAddContent as checkCanAddContent } from './rolePermissions';
import { FIELD_STABLE_QUERY_CONFIG, FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';

export default function FieldBottomActionRail({ 
  jobId, 
  jobName, 
  jobStatus,
  onPhotoClick,
  onAudioClick,
  onTaskClick,
  onMeasureClick,
  onIncidentClick,
}) {
  const [activeAction, setActiveAction] = useState(null);
  const queryClient = useQueryClient();
  
  // Fetch current user for permissions
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });
  
  // Check if user can add content
  const canAddContent = checkCanAddContent(currentUser) && jobStatus === 'active' 
    ? { valid: true, reason: '' }
    : { 
        valid: false, 
        reason: !checkCanAddContent(currentUser) 
          ? 'Only team members can add content' 
          : 'Job must be active to add content'
      };

  // Immediate action handler with feedback
  const handleAction = (actionId) => {
    // Haptic feedback
    haptic.light();
    
    // Close any open action (with visual confirmation)
    if (activeAction && activeAction !== actionId) {
      setActiveAction(null);
      // Brief pause for state transition
      setTimeout(() => setActiveAction(actionId), 100);
    } else {
      setActiveAction(actionId);
    }
  };

  // 5 CORE ACTIONS - Fixed, Always Visible
  const actions = [
    {
      id: 'camera',
      icon: Camera,
      label: 'Photo',
    },
    {
      id: 'audio',
      icon: Mic,
      label: 'Audio',
    },
    {
      id: 'task',
      icon: CheckSquare,
      label: 'Task',
    },
    {
      id: 'measure',
      icon: Ruler,
      label: 'Measure',
    },
    {
      id: 'incident',
      icon: AlertTriangle,
      label: 'Incident',
    },
  ];

  return (
    <>
      {/* BOTTOM ACTION RAIL - Fixed, Always Visible, Thumb-Optimized */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-black border-t-2 border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-1 py-2">
          {actions.map((action) => {
            const isActive = activeAction === action.id;
            const Icon = action.icon;
            
            // Disable actions if job is not active
            const isDisabled = !canAddContent.valid && action.id !== 'incident';
            
            return (
              <button
                key={action.id}
                onClick={() => {
                  if (isDisabled) {
                    // Visual + haptic feedback for disabled action
                    haptic.error();
                    microToast.info(canAddContent.reason, 2000);
                  } else {
                    handleAction(action.id);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] max-w-[100px] rounded-xl touch-manipulation transition-all ${
                  isActive 
                    ? 'bg-orange-600 text-black scale-105 shadow-lg' 
                    : isDisabled
                    ? 'text-slate-500 opacity-50'
                    : 'text-white active:bg-slate-800'
                } ${!isDisabled && 'active:scale-95'}`}
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '56px',
                  minHeight: '64px',
                }}
                aria-label={action.label}
              >
                <Icon 
                  className={`w-6 h-6 ${isActive ? 'text-black' : 'text-white'}`} 
                  strokeWidth={2.5} 
                />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-black' : 'text-slate-300'
                }`}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Offline Status - Integrated, Non-Intrusive */}
        <div className="absolute top-2 right-2 pointer-events-none">
          <OfflineStatusBadge />
        </div>
      </div>

      {/* SINGLE ACTIVE DIALOG - ONE AT A TIME */}
      {/* Photo Capture */}
      <MobilePhotoCapture
        open={activeAction === 'camera'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        jobId={jobId}
        onPhotoCreated={() => {
          setActiveAction(null);
        }}
      />

      {/* Task Creation */}
      <CreateTaskDialog
        open={activeAction === 'task'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        jobId={jobId}
        onCreated={() => {
          setActiveAction(null);
        }}
      />

      {/* Audio Recording */}
      <VoiceNoteRecorder
        open={activeAction === 'audio'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        jobId={jobId}
        jobName={jobName}
        onComplete={() => {
          setActiveAction(null);
        }}
      />

      {/* Measurement */}
      <DimensionBottomSheet
        open={activeAction === 'measure'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        jobId={jobId}
        jobName={jobName}
        onSave={(data) => {
          setActiveAction(null);
        }}
      />

      {/* Incident Report */}
      <IncidentBottomSheet
        open={activeAction === 'incident'}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        jobId={jobId}
        jobName={jobName}
        onCreated={() => {
          setActiveAction(null);
          queryClient.invalidateQueries({ queryKey: ['safety-incidents', jobId] });
        }}
      />
    </>
  );
}