import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  FileQuestion,
  Send,
  CheckCircle,
  Edit,
  Clock,
  AlertCircle,
  Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function VerRFI() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const rfiId = urlParams.get('id');

  const [response, setResponse] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: rfi, isLoading } = useQuery({
    queryKey: ['rfi', rfiId],
    queryFn: () => base44.entities.RFI.get(rfiId),
    enabled: !!rfiId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RFI.update(rfiId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfi', rfiId] });
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      toast.success('RFI updated successfully');
    }
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      status: 'submitted',
      date_submitted: new Date().toISOString()
    });
  };

  const handleAnswer = () => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    updateMutation.mutate({
      status: 'answered',
      response: response,
      date_answered: new Date().toISOString(),
      answered_by: user?.email,
      answered_by_name: user?.full_name
    });
    setResponse('');
  };

  const handleClose = () => {
    updateMutation.mutate({ status: 'closed' });
  };

  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin && (rfi?.status === 'draft' || rfi?.status === 'submitted');
  const canAnswer = isAdmin && (rfi?.status === 'submitted' || rfi?.status === 'under_review');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rfi) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">RFI not found</p>
        </div>
      </div>
    );
  }

  const statusMeta = {
    draft: { color: 'soft-slate-bg', icon: Edit },
    submitted: { color: 'soft-blue-bg', icon: Clock },
    under_review: { color: 'soft-amber-bg', icon: AlertCircle },
    answered: { color: 'soft-green-bg', icon: CheckCircle },
    closed: { color: 'soft-slate-bg', icon: CheckCircle }
  }[rfi.status] || { color: 'soft-slate-bg', icon: FileQuestion };

  const StatusIcon = statusMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('RFIs'))}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{rfi.rfi_number || 'DRAFT'}</h1>
            <p className="text-sm text-slate-500">{rfi.job_name}</p>
          </div>
          <Badge className={`${statusMeta.color} text-sm px-4 py-2`}>
            <StatusIcon className="w-4 h-4 mr-2" />
            {rfi.status?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{rfi.title}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
              <Badge className={rfi.priority === 'critical' ? 'soft-red-gradient' : 
                               rfi.priority === 'high' ? 'soft-amber-bg' : 'soft-blue-bg'}>
                {rfi.priority} priority
              </Badge>
              <span>• {rfi.category}</span>
              {rfi.date_required && (
                <span>• Due: {format(new Date(rfi.date_required), 'MMM dd, yyyy')}</span>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">QUESTION</h3>
              <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {rfi.description}
              </p>
            </div>

            {rfi.related_drawing_refs && rfi.related_drawing_refs.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">RELATED DRAWINGS</h3>
                <div className="flex flex-wrap gap-2">
                  {rfi.related_drawing_refs.map((ref, idx) => (
                    <Badge key={idx} variant="outline">{ref}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(rfi.impacts_schedule || rfi.impacts_cost) && (
              <div className="p-4 soft-red-bg rounded-xl">
                <h3 className="text-sm font-bold text-red-700 mb-2">POTENTIAL IMPACTS</h3>
                {rfi.impacts_schedule && (
                  <p className="text-sm text-red-600">
                    • Schedule: {rfi.schedule_impact_days || '?'} days delay
                  </p>
                )}
                {rfi.impacts_cost && (
                  <p className="text-sm text-red-600">
                    • Cost: ${(rfi.cost_impact || 0).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {rfi.response && (
              <>
                <Separator className="my-6" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">RESPONSE</h3>
                  </div>
                  <div className="p-4 soft-green-bg rounded-xl">
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed mb-3">
                      {rfi.response}
                    </p>
                    <div className="text-xs text-green-700">
                      Answered by {rfi.answered_by_name} on {format(new Date(rfi.date_answered), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {rfi.status === 'draft' && isAdmin && (
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit RFI
            </Button>
          )}

          {canAnswer && !rfi.response && (
            <Card className="p-4 w-full">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">Provide Response</h3>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Enter your response to this RFI..."
                rows={4}
                className="mb-3"
              />
              <Button
                onClick={handleAnswer}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Response
              </Button>
            </Card>
          )}

          {rfi.status === 'answered' && isAdmin && (
            <Button
              onClick={handleClose}
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Close RFI
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}