import React, { useState } from 'react';
import { Camera, Mic, CheckSquare, Ruler, AlertTriangle } from 'lucide-react';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import DimensionBottomSheet from './DimensionBottomSheet';
import IncidentBottomSheet from './IncidentBottomSheet';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OfflineStatusBadge } from './FieldOfflineManager';

export default function FieldBottomActionRail({ 
  jobId, 
  jobName, 
  onPhotoClick,
  onAudioClick,
  onTaskClick,
  onMeasureClick,
  onIncidentClick,
}) {
  const [activeAction, setActiveAction] = useState(null);
  const queryClient = useQueryClient();

  // Immediate action handler with feedback
  const handleAction = (actionId, callback) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
    
    // Close any open action
    if (activeAction && activeAction !== actionId) {
      setActiveAction(null);
    }
    
    // Execute action
    setActiveAction(actionId);
    callback?.();
  };

  // 5 CORE ACTIONS - Fixed, Always Visible
  const actions = [
    {
      id: 'camera',
      icon: Camera,
      label: 'Photo',
      action: () => handleAction('camera', onPhotoClick),
    },
    {
      id: 'audio',
      icon: Mic,
      label: 'Audio',
      action: () => handleAction('audio', onAudioClick),
    },
    {
      id: 'task',
      icon: CheckSquare,
      label: 'Task',
      action: () => handleAction('task', onTaskClick),
    },
    {
      id: 'measure',
      icon: Ruler,
      label: 'Measure',
      action: () => handleAction('measure', onMeasureClick),
    },
    {
      id: 'incident',
      icon: AlertTriangle,
      label: 'Incident',
      action: () => handleAction('incident', onIncidentClick),
    },
  ];

  return (
    <>
      {/* BOTTOM ACTION RAIL - Fixed, Always Visible, Thumb-Optimized */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-900 border-t-2 border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-2 py-3">
          {actions.map((action) => {
            const isActive = activeAction === action.id;
            const Icon = action.icon;
            
            return (
              <button
                key={action.id}
                onClick={action.action}
                className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] max-w-[100px] rounded-xl touch-manipulation active:scale-95 transition-all ${
                  isActive 
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-800 active:bg-slate-700'
                }`}
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '56px',
                  minHeight: '64px',
                }}
                aria-label={action.label}
              >
                <Icon 
                  className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-300'}`} 
                  strokeWidth={2.5} 
                />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {action.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-1 right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Offline Status - Integrated, Non-Intrusive */}
        <div className="absolute top-2 right-2">
          <OfflineStatusBadge />
        </div>
      </div>

      {/* SINGLE ACTIVE DIALOG - ONE AT A TIME */}
      {/* Photo Capture */}
      <MobilePhotoCapture
        open={activeAction === 'camera'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            toast.success('Photo saved offline', { duration: 2000 });
          }
        }}
        jobId={jobId}
        onPhotoCreated={() => {
          setActiveAction(null);
          toast.success('Photo saved offline', { duration: 2000 });
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
          toast.success('Task created', { duration: 2000 });
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
          toast.success('Note saved offline', { duration: 2000 });
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
          toast.success('Measurement saved', { duration: 2000 });
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
          toast.success('Incident reported', { duration: 2000 });
        }}
      />
    </>
  );
}