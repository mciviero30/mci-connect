import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

export default function PunchItemReview({ punchItem, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [reviewNotes, setReviewNotes] = useState(punchItem?.review_notes || '');
  const [converting, setConverting] = useState(false);

  const updatePunchMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
      success('Punch item updated');
    },
  });

  const handleAccept = () => {
    updatePunchMutation.mutate({
      id: punchItem.id,
      data: { 
        punch_status: 'accepted',
        review_notes: reviewNotes,
      }
    });
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      error('Please provide a reason for rejection');
      return;
    }
    
    updatePunchMutation.mutate({
      id: punchItem.id,
      data: { 
        punch_status: 'rejected',
        review_notes: reviewNotes,
      }
    });
  };

  const handleConvertToTask = async () => {
    setConverting(true);
    try {
      // Create new task from punch
      const newTask = await base44.entities.Task.create({
        job_id: punchItem.job_id,
        title: punchItem.title,
        description: punchItem.description,
        task_type: 'task',
        category: 'installation',
        status: 'pending',
        priority: 'medium',
        blueprint_id: punchItem.blueprint_id,
        pin_x: punchItem.pin_x,
        pin_y: punchItem.pin_y,
        photo_urls: punchItem.photo_urls,
        visible_to_client: true,
      });

      // Update original punch
      await base44.entities.Task.update(punchItem.id, {
        punch_status: 'converted_to_task',
        converted_to_id: newTask.id,
        review_notes: reviewNotes,
      });

      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
      success('Converted to Task');
      onOpenChange(false);
    } catch (err) {
      error('Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToChangeOrder = async () => {
    setConverting(true);
    try {
      const newTask = await base44.entities.Task.create({
        job_id: punchItem.job_id,
        title: `[CHANGE ORDER] ${punchItem.title}`,
        description: punchItem.description,
        task_type: 'task',
        category: 'change_order',
        status: 'pending',
        priority: 'high',
        blueprint_id: punchItem.blueprint_id,
        pin_x: punchItem.pin_x,
        pin_y: punchItem.pin_y,
        photo_urls: punchItem.photo_urls,
        visible_to_client: true,
      });

      await base44.entities.Task.update(punchItem.id, {
        punch_status: 'converted_to_change_order',
        converted_to_id: newTask.id,
        review_notes: reviewNotes,
      });

      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
      success('Converted to Change Order');
      onOpenChange(false);
    } catch (err) {
      error('Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  if (!punchItem) return null;

  const getPunchStatusColor = (status) => {
    switch (status) {
      case 'client_submitted': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'converted_to_task': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'converted_to_change_order': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            Review Client Punch Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Punch Details */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-purple-600 text-white">Client Submitted</Badge>
              <Badge className={`${getPunchStatusColor(punchItem.punch_status)} border`}>
                {punchItem.punch_status?.replace(/_/g, ' ')}
              </Badge>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">{punchItem.title}</h3>
            {punchItem.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{punchItem.description}</p>
            )}
            
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>Submitted by: {punchItem.created_by}</p>
              <p>Date: {format(new Date(punchItem.created_date), 'MMM dd, yyyy h:mm a')}</p>
              {punchItem.blueprint_id && <p>📍 Pinned to drawing</p>}
            </div>
          </div>

          {/* Photos */}
          {punchItem.photo_urls?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Client Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {punchItem.photo_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-slate-200"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              Internal Review Notes
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add internal notes about this punch item..."
              className="min-h-[80px]"
            />
          </div>

          {/* Actions */}
          {punchItem.punch_status === 'client_submitted' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={updatePunchMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={updatePunchMutation.isPending}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleConvertToTask}
                  disabled={converting}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  → Task
                </Button>
                <Button
                  onClick={handleConvertToChangeOrder}
                  disabled={converting}
                  variant="outline"
                  className="border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  → Change Order
                </Button>
              </div>
            </div>
          )}

          {punchItem.punch_status !== 'client_submitted' && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Status: <strong>{punchItem.punch_status?.replace(/_/g, ' ')}</strong>
              </p>
              {punchItem.review_notes && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Notes: {punchItem.review_notes}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}