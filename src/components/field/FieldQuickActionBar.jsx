import React, { useState } from 'react';
import { Camera, FileText, CheckSquare, AlertTriangle, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import NoteDialog from './NoteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createPageUrl } from '@/utils';

export default function FieldQuickActionBar({ jobId, onActionComplete }) {
  const [activeAction, setActiveAction] = useState(null);

  const actions = [
    {
      id: 'photo',
      icon: Camera,
      label: 'Photo',
      color: 'from-blue-500 to-blue-600',
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
    {
      id: 'blueprint',
      icon: Map,
      label: 'Plans',
      color: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <>
      {/* Mobile Bottom Bar - Enhanced for outdoor use */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t-4 border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-2 py-4 gap-1">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setActiveAction(action.id)}
              className="flex flex-col items-center gap-2 flex-1 touch-manipulation active:scale-95 transition-transform active:opacity-80"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-2xl border-2 border-white/20`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-slate-100 font-bold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Floating Toolbar - 48px touch targets */}
      <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 bg-slate-900 border-2 border-slate-700 rounded-2xl p-3 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className="group relative flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl active:scale-95 transition-all shadow-lg touch-manipulation"
            title={action.label}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.color}`} />
            <action.icon className="w-7 h-7 text-white relative z-10" />
            <span className="absolute right-full mr-3 px-4 py-2 bg-slate-800 text-white text-base font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border-2 border-slate-700 shadow-xl">
              {action.label}
            </span>
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

      {/* Incident Dialog - Navigate to incident page with job pre-filled */}
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
                  className="flex-1 border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = `${createPageUrl('CrearIncidente')}?job_id=${jobId}`;
                  }}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}