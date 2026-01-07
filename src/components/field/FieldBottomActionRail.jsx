import React, { useState } from 'react';
import { Camera, Mic, CheckSquare, Ruler, AlertTriangle } from 'lucide-react';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FieldBottomActionRail({ jobId, jobName, onActionComplete }) {
  const [activeAction, setActiveAction] = useState(null);

  const actions = [
    {
      id: 'camera',
      icon: Camera,
      color: 'from-blue-600 to-cyan-600',
      label: 'Camera',
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
      label: 'Dimension',
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
      {/* Mobile: Bottom-Right Rail */}
      <div className="md:hidden fixed bottom-20 right-3 z-40 flex flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className={`group relative w-14 h-14 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-2xl border-2 border-white/30 touch-manipulation active:scale-90 transition-transform`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label={action.label}
          >
            <action.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      {/* Tablet/Desktop: Bottom-Center Rail */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 gap-3 bg-slate-900/95 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-3 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className={`group relative w-16 h-16 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg active:scale-95 transition-transform`}
            aria-label={action.label}
          >
            <action.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
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

      {/* Dimension Dialog - Navigate to dimensions view */}
      {activeAction === 'dimension' && (
        <Dialog open onOpenChange={(open) => !open && setActiveAction(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Dimension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-slate-300 text-sm">Navigate to the Dimensions panel to add measurements.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  className="flex-1 border-slate-700 text-slate-300 min-h-[48px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setActiveAction(null);
                    onActionComplete?.('dimensions');
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white min-h-[48px]"
                >
                  Go to Dimensions
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Incident Dialog - Navigate to incident form */}
      {activeAction === 'incident' && (
        <Dialog open onOpenChange={(open) => !open && setActiveAction(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>Report Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-slate-300 text-sm">This will open the incident reporting form.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  className="flex-1 border-slate-700 text-slate-300 min-h-[48px]"
                >
                  Cancel
                </Button>
                <Link to={`${createPageUrl('CrearIncidente')}?job_id=${jobId}`} className="flex-1">
                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white min-h-[48px]"
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