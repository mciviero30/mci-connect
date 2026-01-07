import React, { useState } from 'react';
import { Camera, FileText, CheckSquare, AlertTriangle, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateTaskDialog from './CreateTaskDialog';
import MobilePhotoCapture from './MobilePhotoCapture';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { fieldStorage } from './services/FieldStorageService';
import { createPageUrl } from '@/utils';

export default function FieldQuickActionBar({ jobId, onActionComplete }) {
  const [activeAction, setActiveAction] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const isOnline = navigator.onLine;

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    
    setSaving(true);
    try {
      if (isOnline) {
        await base44.entities.ChatMessage.create({
          project_id: jobId,
          job_id: jobId,
          message: noteText,
          content: noteText,
          channel: 'general',
          sender_email: (await base44.auth.me()).email,
          sender_name: (await base44.auth.me()).full_name,
        });
      } else {
        await fieldStorage.save('notes', {
          id: `temp_${Date.now()}`,
          job_id: jobId,
          message: noteText,
          content: noteText,
        });
      }
      
      setNoteText('');
      setActiveAction(null);
      onActionComplete?.();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note');
    }
    setSaving(false);
  };

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
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-4 py-3 gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => setActiveAction(action.id)}
              className="flex flex-col items-center gap-1 min-w-[60px] touch-manipulation active:scale-95 transition-transform"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-slate-300 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Floating Toolbar */}
      <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-3 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className="group relative flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br hover:scale-110 transition-all shadow-lg"
            style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
            title={action.label}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.color}`} />
            <action.icon className="w-6 h-6 text-white relative z-10" />
            <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
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

      {/* Note Dialog */}
      <Dialog open={activeAction === 'note'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Quick Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your note..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveAction(null)}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                disabled={!noteText.trim() || saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
              >
                {saving ? 'Saving...' : isOnline ? 'Save Note' : 'Save Offline'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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