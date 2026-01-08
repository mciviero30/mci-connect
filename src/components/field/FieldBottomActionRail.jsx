import React, { useState } from 'react';
import { Camera, Mic, CheckSquare, Ruler, AlertTriangle } from 'lucide-react';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import DimensionBottomSheet from './DimensionBottomSheet';
import IncidentBottomSheet from './IncidentBottomSheet';
import { useQueryClient } from '@tanstack/react-query';

export default function FieldBottomActionRail({ 
  jobId, 
  jobName, 
  onActionComplete,
  currentPanel,  // NEW: Context-aware highlighting
  isRecording,   // NEW: Active state tracking
  isCapturing,   // NEW: Active state tracking
  isMeasuring,   // NEW: Active state tracking
  panelManager   // NEW: Strict single-panel control
}) {
  const [activeAction, setActiveAction] = useState(null);
  const queryClient = useQueryClient();

  // Handle panel opening - close any other open panel first
  const handleOpenPanel = (panelId) => {
    if (panelManager) {
      panelManager.openPanelExclusive(panelId, 'dialog');
    }
    setActiveAction(panelId);
  };

  // Primary actions - context-aware relevance
  const actions = [
    {
      id: 'camera',
      icon: Camera,
      color: 'from-blue-600 to-cyan-600',
      label: 'Photo',
      relevantPanels: ['photos', 'overview', 'tasks', 'before-after'],
      activeState: isCapturing,
    },
    {
      id: 'audio',
      icon: Mic,
      color: 'from-orange-600 to-red-600',
      label: 'Audio',
      relevantPanels: ['site-notes', 'voice', 'overview'],
      activeState: isRecording,
    },
    {
      id: 'task',
      icon: CheckSquare,
      color: 'from-green-600 to-emerald-600',
      label: 'Task',
      relevantPanels: ['tasks', 'overview'],
      activeState: false,
    },
    {
      id: 'dimension',
      icon: Ruler,
      color: 'from-purple-600 to-pink-600',
      label: 'Measure',
      relevantPanels: ['dimensions', 'overview', 'plans'],
      activeState: isMeasuring,
    },
    {
      id: 'incident',
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-700',
      label: 'Incident',
      relevantPanels: ['activity', 'overview'],
      activeState: false,
    },
  ];

  return (
    <>
      {/* Mobile: Bottom-Right Floating Action Rail - Thumb-First Design */}
      {/* CRITICAL: Positioned for right-thumb reach, context-aware highlighting */}
      <div className="md:hidden fixed bottom-24 right-3 z-[60] flex flex-col gap-3">
        {actions.map((action) => {
          const isRelevant = !currentPanel || action.relevantPanels.includes(currentPanel);
          const isActive = action.activeState;
          
          return (
            <button
              key={action.id}
              onClick={() => {
                // Haptic feedback (10ms vibration)
                if (navigator.vibrate) navigator.vibrate(10);
                handleOpenPanel(action.id);
              }}
              className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-2xl border-3 touch-manipulation active:scale-90 transition-all ${
                isActive 
                  ? 'border-white animate-pulse' 
                  : isRelevant 
                  ? 'border-white/40' 
                  : 'border-white/20 opacity-60'
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                minWidth: '64px',
                minHeight: '64px',
              }}
              aria-label={action.label}
            >
              <action.icon className="w-7 h-7 text-white" strokeWidth={isRelevant ? 2.5 : 2} />
              
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow-lg animate-pulse" />
              )}
              
              {/* Tooltip on long press / hover */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 pointer-events-none transition-opacity whitespace-nowrap">
                {action.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tablet/Desktop: Bottom-Center Rail */}
      <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] gap-4 bg-slate-900/95 backdrop-blur-sm border-3 border-slate-700 rounded-2xl p-4 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleOpenPanel(action.id)}
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
        open={panelManager ? panelManager.isPanelOpen('camera') : activeAction === 'camera'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            panelManager?.closePanel();
          }
        }}
        jobId={jobId}
        onPhotoCreated={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Task Dialog */}
      <CreateTaskDialog
        open={panelManager ? panelManager.isPanelOpen('task') : activeAction === 'task'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            panelManager?.closePanel();
          }
        }}
        jobId={jobId}
        onCreated={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Voice Note Recorder */}
      <VoiceNoteRecorder
        open={panelManager ? panelManager.isPanelOpen('audio') : activeAction === 'audio'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            panelManager?.closePanel();
          }
        }}
        jobId={jobId}
        jobName={jobName}
        onComplete={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Dimension Bottom Sheet */}
      <DimensionBottomSheet
        open={panelManager ? panelManager.isPanelOpen('dimension') : activeAction === 'dimension'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            panelManager?.closePanel();
          }
        }}
        jobId={jobId}
        jobName={jobName}
        onSave={(data) => {
          setActiveAction(null);
          onActionComplete?.('dimensions');
        }}
      />

      {/* Incident Bottom Sheet */}
      <IncidentBottomSheet
        open={panelManager ? panelManager.isPanelOpen('incident') : activeAction === 'incident'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            panelManager?.closePanel();
          }
        }}
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