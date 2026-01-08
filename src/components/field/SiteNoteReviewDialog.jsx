import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Edit, Trash2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function SiteNoteReviewDialog({ session, open, onOpenChange, onReviewed }) {
  const [editedNotes, setEditedNotes] = useState(session.structured_notes || {});
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const removeNote = (category, index) => {
    setEditedNotes(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const editNoteContent = (category, index, newContent) => {
    setEditedNotes(prev => ({
      ...prev,
      [category]: prev[category].map((note, i) => 
        i === index ? { ...note, content: newContent } : note
      )
    }));
  };

  const handleApprove = async (status) => {
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.SiteNoteSession.update(session.id, {
        structured_notes: editedNotes,
        review_status: status,
        reviewed_by: user.email,
        reviewed_by_name: user.full_name,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      });

      toast.success(`Site note ${status === 'approved' ? 'approved' : status === 'approved_with_edits' ? 'approved with edits' : 'marked for follow-up'}`);
      onOpenChange(false);
      
      if (onReviewed) {
        onReviewed();
      }
    } catch (error) {
      console.error('Failed to review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { key: 'general_observations', label: 'General Observations' },
    { key: 'area_specific', label: 'Area-Specific Notes' },
    { key: 'measurement_comments', label: 'Measurement Comments' },
    { key: 'condition_issues', label: 'Condition Issues' },
    { key: 'safety_concerns', label: 'Safety Concerns' },
    { key: 'installation_constraints', label: 'Installation Constraints' }
  ];

  const hasEdits = JSON.stringify(editedNotes) !== JSON.stringify(session.structured_notes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Site Note</DialogTitle>
          <DialogDescription>
            AI output is advisory until you confirm. Edit, remove, or approve notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Advisory Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <div className="font-semibold text-amber-900 mb-1">Human Review Required</div>
              <div className="text-amber-700">
                AI-generated notes are advisory only. Review and confirm accuracy before finalizing.
              </div>
            </AlertDescription>
          </Alert>

          {/* Raw Transcript */}
          <div>
            <label className="font-semibold mb-2 block">Raw Transcript</label>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm">
              {session.transcript_raw}
            </div>
          </div>

          {/* Editable Structured Notes */}
          <div>
            <label className="font-semibold mb-2 block">Structured Notes (Editable)</label>
            <div className="space-y-3">
              {categories.map(category => {
                const items = editedNotes[category.key] || [];
                if (items.length === 0) return null;

                return (
                  <div key={category.key} className="border rounded-lg p-3">
                    <div className="font-semibold text-sm mb-2 flex items-center justify-between">
                      <span>{category.label}</span>
                      <Badge variant="outline">{items.length} items</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-900 rounded relative group">
                          <div className="flex gap-2">
                            <Textarea
                              value={item.content}
                              onChange={(e) => editNoteContent(category.key, idx, e.target.value)}
                              className="flex-1 min-h-[60px]"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeNote(category.key, idx)}
                              className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {item.area && (
                            <div className="text-xs text-slate-600 mt-1">
                              Area: {item.area}
                            </div>
                          )}
                          {item.severity && (
                            <Badge className="mt-1 text-xs">
                              {item.severity} severity
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked Media */}
          {session.captured_media && session.captured_media.length > 0 && (
            <div>
              <label className="font-semibold mb-2 block">Captured Evidence</label>
              <div className="grid grid-cols-4 gap-2">
                {session.captured_media.map((media, idx) => (
                  <div key={idx} className="relative aspect-square rounded border overflow-hidden">
                    {media.media_type === 'photo' ? (
                      <img src={media.media_url} alt="Evidence" className="w-full h-full object-cover" />
                    ) : (
                      <video src={media.media_url} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div>
            <label className="font-semibold mb-2 block">Review Notes (Optional)</label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any comments about your review..."
              className="min-h-[80px]"
            />
          </div>

          {/* Edit Indicator */}
          {hasEdits && (
            <Alert className="border-blue-200 bg-blue-50">
              <Edit className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                You've made edits to the AI-generated notes. These will be saved when you approve.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleApprove('approved')}
              disabled={submitting}
              className="flex-1 bg-green-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleApprove('approved_with_edits')}
              disabled={submitting || !hasEdits}
              className="flex-1 bg-blue-600 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Approve with Edits
            </Button>
            <Button
              onClick={() => handleApprove('needs_followup')}
              disabled={submitting}
              className="flex-1 bg-amber-600 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Needs Follow-up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}