import React, { useState } from 'react';
import { Camera, Mic, CheckSquare, Ruler, AlertTriangle } from 'lucide-react';
import CreateTaskDialog from '@/components/field/CreateTaskDialog';
import MobilePhotoCapture from '@/components/field/MobilePhotoCapture';
import VoiceNoteRecorder from '@/components/field/VoiceNoteRecorder';
import DimensionBottomSheet from '@/components/field/DimensionBottomSheet';
import IncidentBottomSheet from '@/components/field/IncidentBottomSheet';
import { useQueryClient } from '@tanstack/react-query';

export default function FieldBottomActionRail({ jobId, jobName, onActionComplete }) {
  const [activeAction, setActiveAction] = useState(null);
  const queryClient = useQueryClient();

  // Primary actions only - frequently used, critical path
  const actions = [
    {
      id: 'camera',
      icon: Camera,
      color: 'from-blue-600 to-cyan-600',
      label: 'Photo',
    },
    {
      id: 'audio',
      icon: Mic,
      color: 'from-orange-600 to-red-600',
      label: 'Audio',
    },
    {
      id: 'task',
      icon: CheckSquare,
      color: 'from-green-600 to-emerald-600',
      label: 'Task',
    },
    {
      id: 'dimension',
      icon: Ruler,
      color: 'from-purple-600 to-pink-600',
      label: 'Measure',
    },
    {
      id: 'incident',
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-700',
      label: 'Incident',
    },
  ];

  return (
    <>
      {/* Mobile: Bottom-Right Rail - Safe zone with haptic feedback */}
      <div className="md:hidden fixed bottom-20 right-4 z-[60] flex flex-col gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              // Haptic feedback
              if (navigator.vibrate) navigator.vibrate(10);
              setActiveAction(action.id);
            }}
            className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-2xl border-3 border-white/40 touch-manipulation active:scale-90 active:shadow-3xl transition-all`}
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              minWidth: '64px',
              minHeight: '64px'
            }}
            aria-label={action.label}
          >
            <action.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      {/* Tablet/Desktop: Bottom-Center Rail */}
      <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] gap-4 bg-slate-900/95 backdrop-blur-sm border-3 border-slate-700 rounded-2xl p-4 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className={`relative flex flex-col items-center justify-center gap-1 w-20 h-20 rounded-xl bg-gradient-to-br ${action.color} shadow-lg active:scale-95 transition-transform touch-manipulation`}
            aria-label={action.label}
          >
            <action.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
            <span className="text-[10px] text-white font-bold">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Photo Dialog */}
      <MobilePhotoCapture
        open={activeAction === 'camera'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        onPhotoCreated={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Task Dialog */}
      <CreateTaskDialog
        open={activeAction === 'task'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        onCreated={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Voice Note Recorder */}
      <VoiceNoteRecorder
        open={activeAction === 'audio'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        jobName={jobName}
        onComplete={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Dimension Bottom Sheet */}
      <DimensionBottomSheet
        open={activeAction === 'dimension'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        jobName={jobName}
        onSave={(data) => {
          setActiveAction(null);
          onActionComplete?.('dimensions');
        }}
      />

      {/* Incident Bottom Sheet */}
      <IncidentBottomSheet
        open={activeAction === 'incident'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        jobName={jobName}
        onCreated={() => {
          setActiveAction(null);
          queryClient.invalidateQueries({ queryKey: ['safety-incidents', jobId] });
          onActionComplete?.();
        }}
      />
    </>
  );
}