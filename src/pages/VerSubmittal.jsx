import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  FileCheck,
  Send,
  CheckCircle,
  Edit,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function VerSubmittal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const submittalId = urlParams.get('id');

  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState('approved');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submittal, isLoading } = useQuery({
    queryKey: ['submittal', submittalId],
    queryFn: () => base44.entities.Submittal.get(submittalId),
    enabled: !!submittalId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Submittal.update(submittalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittal', submittalId] });
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      toast.success('Submittal updated successfully');
    }
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      status: 'submitted',
      date_submitted: new Date().toISOString(),
      ball_in_court: 'architect'
    });
  };

  const handleReview = () => {
    updateMutation.mutate({
      status: reviewAction,
      reviewer_comments: reviewComments,
      reviewed_by: user?.email,
      reviewed_by_name: user?.full_name,
      date_reviewed: new Date().toISOString(),
      ball_in_court: reviewAction === 'approved' || reviewAction === 'approved_as_noted' ? 'contractor' : 
                     reviewAction === 'revise_resubmit' ? 'contractor' : 'architect'
    });
    setReviewComments('');
  };

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!submittal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Submittal not found</p>
        </div>
      </div>
    );
  }

  const statusMeta = {
    draft: { color: 'soft-slate-bg', icon: Edit, label: 'Draft' },
    submitted: { color: 'soft-blue-bg', icon: Clock, label: 'Submitted' },
    under_review: { color: 'soft-amber-bg', icon: Clock, label: 'Under Review' },
    approved: { color: 'soft-green-bg', icon: CheckCircle, label: 'Approved' },
    approved_as_noted: { color: 'soft-cyan-bg', icon: CheckCircle, label: 'Approved as Noted' },
    revise_resubmit: { color: 'soft-purple-bg', icon: RotateCcw, label: 'Revise & Resubmit' },
    rejected: { color: 'soft-red-bg', icon: XCircle, label: 'Rejected' }
  }[submittal.status] || { color: 'soft-slate-bg', icon: FileCheck, label: 'Unknown' };

  const StatusIcon = statusMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Submittals'))}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {submittal.submittal_number || 'DRAFT'}
              {submittal.revision_number > 1 && (
                <span className="text-base text-slate-500 ml-2">Rev {submittal.revision_number}</span>
              )}
            </h1>
            <p className="text-sm text-slate-500">{submittal.job_name}</p>
          </div>
          <Badge className={`${statusMeta.color} text-sm px-4 py-2`}>
            <StatusIcon className="w-4 h-4 mr-2" />
            {statusMeta.label}
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{submittal.title}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Badge className="soft-blue-bg">{submittal.submittal_type?.replace('_', ' ')}</Badge>
              {submittal.spec_section && <span>Spec: {submittal.spec_section}</span>}
              {submittal.manufacturer && <span>• {submittal.manufacturer}</span>}
              {submittal.model_number && <span>#{submittal.model_number}</span>}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            {submittal.description && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">DESCRIPTION</h3>
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {submittal.description}
                </p>
              </div>
            )}

            {submittal.quantity && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">QUANTITY</h3>
                <p className="text-slate-900 dark:text-white">
                  {submittal.quantity} {submittal.unit || 'units'}
                </p>
              </div>
            )}

            {submittal.lead_time_days && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">LEAD TIME</h3>
                <p className="text-slate-900 dark:text-white">
                  {submittal.lead_time_days} days
                </p>
              </div>
            )}

            {submittal.reviewer_comments && (
              <>
                <Separator className="my-6" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">REVIEWER COMMENTS</h3>
                  </div>
                  <div className={`p-4 rounded-xl ${
                    submittal.status === 'approved' || submittal.status === 'approved_as_noted' 
                      ? 'soft-green-bg' 
                      : 'soft-amber-bg'
                  }`}>
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed mb-3">
                      {submittal.reviewer_comments}
                    </p>
                    <div className="text-xs text-slate-600">
                      Reviewed by {submittal.reviewed_by_name} on {format(new Date(submittal.date_reviewed), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          {submittal.status === 'draft' && isAdmin && (
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}

          {(submittal.status === 'submitted' || submittal.status === 'under_review') && isAdmin && (
            <Card className="p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Review Submittal</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Review Decision</Label>
                  <Select value={reviewAction} onValueChange={setReviewAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">✓ Approved</SelectItem>
                      <SelectItem value="approved_as_noted">✓ Approved as Noted</SelectItem>
                      <SelectItem value="revise_resubmit">↻ Revise & Resubmit</SelectItem>
                      <SelectItem value="rejected">✗ Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Comments</Label>
                  <Textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter review comments..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleReview}
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}