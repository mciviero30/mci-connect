import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAutoSave } from './hooks/useAutoSave';
import SaveIndicator from './SaveIndicator';

export default function NoteDialog({ open, onOpenChange, jobId, onComplete }) {
  const [noteText, setNoteText] = useState('');
  
  const { autoSave, loadDraft, clearDraft, isSaving, lastSaved, isOnline } = useAutoSave({
    entityType: 'notes',
    jobId,
    enabled: open,
    debounceMs: 1500
  });

  useEffect(() => {
    if (open) {
      loadDraft().then(draft => {
        if (draft?.content) {
          setNoteText(draft.content);
        }
      });
    }
  }, [open]);

  const handleChange = (value) => {
    setNoteText(value);
    if (value.trim()) {
      autoSave({ content: value, message: value });
    }
  };

  const handleClose = async () => {
    if (noteText.trim()) {
      // Keep draft on close
      onOpenChange(false);
    } else {
      await clearDraft();
      onOpenChange(false);
    }
    setNoteText('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Quick Note</DialogTitle>
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} isOnline={isOnline} />
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        <div className="pt-4">
          <Textarea
            value={noteText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start typing your note..."
            className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            autoFocus
          />
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}