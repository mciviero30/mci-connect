import React, { useState } from 'react';
import { Camera, FileText, CheckSquare, AlertTriangle, Map, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import NoteDialog from './NoteDialog';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FieldQuickActionBar({ jobId, jobName, onActionComplete }) {
  const [activeAction, setActiveAction] = useState(null);

  const actions = [
    {
      id: 'photo',
      icon: Camera,
      label: 'Photo',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'note',
      icon: FileText,
      label: 'Note',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'task',
      icon: CheckSquare,
      label: 'Task',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'incident',
      icon: AlertTriangle,
      label: 'Incident',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <>
      {/* One-Hand Mode: Bottom Action Bar - Optimized for thumb reach */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t-4 border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-1 py-3 gap-1">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setActiveAction(action.id)}
              className="flex flex-col items-center gap-1.5 flex-1 touch-manipulation active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-2xl border-2 border-white/20 active:scale-90 transition-transform`}>
                <action.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-100 font-bold tracking-wide">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Bottom-aligned for consistency with mobile UX */}
      <div className="hidden md:flex fixed bottom-8 right-8 z-40 gap-3 bg-slate-900 border-2 border-slate-700 rounded-2xl p-3 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className="group relative flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-xl active:scale-95 transition-all shadow-lg touch-manipulation gap-1"
            title={action.label}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.color}`} />
            <action.icon className="w-7 h-7 text-white relative z-10" strokeWidth={2.5} />
            <span className="text-[10px] text-white font-bold relative z-10">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Photo Dialog */}
      <MobilePhotoCapture
        open={activeAction === 'photo'}
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

      {/* Note Dialog - Auto-save on input */}
      <NoteDialog
        open={activeAction === 'note'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        onComplete={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Voice Note Recorder */}
      <VoiceNoteRecorder
        open={activeAction === 'voice'}
        onOpenChange={(open) => !open && setActiveAction(null)}
        jobId={jobId}
        jobName={jobName}
        onComplete={() => {
          setActiveAction(null);
          onActionComplete?.();
        }}
      />

      {/* Incident Dialog - Navigate WITHOUT reload */}
      {activeAction === 'incident' && (
        <Dialog open onOpenChange={(open) => !open && setActiveAction(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Report Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-slate-300 text-sm">This will open the incident reporting form.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  className="flex-1 border-slate-700 text-slate-300 min-h-[48px] touch-manipulation"
                >
                  Cancel
                </Button>
                <Link to={`${createPageUrl('CrearIncidente')}?job_id=${jobId}`} className="flex-1">
                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white min-h-[48px] touch-manipulation"
                  >
                    Continue
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}