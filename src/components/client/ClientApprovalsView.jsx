import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, XCircle, Clock, FileText, DollarSign, AlertCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SignaturePad from '@/components/client/SignaturePad';
import { processClientApproval } from '@/functions/processClientApproval';

export default function ClientApprovalsView({ customerEmail }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [signature, setSignature] = useState('');

  // Fetch pending approvals for this customer
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['client-approvals', customerEmail],
    queryFn: async () => {
      const allApprovals = await base44.entities.ClientApproval.filter({
        customer_email: customerEmail
      }, '-requested_at');
      return allApprovals;
    },
    enabled: !!customerEmail,
  });

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');

  const approveMutation = useMutation({
    mutationFn: async ({ approval_id, signature_data_url }) => {
      const response = await processClientApproval({
        approval_id,
        action: 'approve',
        approver_email: customerEmail,
        signature_data_url
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-approvals']);
      setShowApproveDialog(false);
      setSelectedApproval(null);
      setSignature('');
      toast({
        title: 'Approved!',
        description: 'Your approval has been recorded',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ approval_id, rejection_reason }) => {
      const response = await processClientApproval({
        approval_id,
        action: 'reject',
        approver_email: customerEmail,
        rejection_reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-approvals']);
      setShowRejectDialog(false);
      setSelectedApproval(null);
      setRejectionReason('');
      toast({
        title: 'Rejected',
        description: 'Your feedback has been sent to the team',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getItemTypeIcon = (type) => {
    switch(type) {
      case 'quote': return DollarSign;
      case 'change_order': return FileText;
      case 'rfi': return AlertCircle;
      case 'submittal': return FileText;
      default: return FileText;
    }
  };

  const getItemTypeLabel = (type) => {
    switch(type) {
      case 'quote': return 'Quote';
      case 'change_order': return 'Change Order';
      case 'rfi': return 'RFI';
      case 'submittal': return 'Submittal';
      default: return type;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            Pending Your Approval ({pendingApprovals.length})
          </h3>
          <div className="space-y-4">
            {pendingApprovals.map((approval) => {
              const Icon = getItemTypeIcon(approval.item_type);
              const isUrgent = approval.priority === 'urgent' || approval.priority === 'high';
              const daysLeft = approval.due_date 
                ? Math.ceil((new Date(approval.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
                <Card key={approval.id} className={`border-2 ${isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-blue-200'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-3 rounded-xl ${
                          isUrgent ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            isUrgent ? 'text-amber-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                              {approval.title}
                            </h4>
                            <Badge className={isUrgent ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}>
                              {getItemTypeLabel(approval.item_type)}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                            {approval.description}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {approval.amount && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Amount:</span>
                                <span className="ml-2 font-bold text-green-600">
                                  ${approval.amount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Requested:</span>
                              <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                                {format(new Date(approval.requested_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            {daysLeft !== null && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Due in:</span>
                                <span className={`ml-2 font-bold ${
                                  daysLeft <= 2 ? 'text-red-600' : daysLeft <= 5 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowApproveDialog(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white min-h-[48px]"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowRejectDialog(true);
                        }}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 min-h-[48px]"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Approvals */}
      {completedApprovals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Recent Decisions
          </h3>
          <div className="space-y-3">
            {completedApprovals.slice(0, 5).map((approval) => (
              <Card key={approval.id} className="bg-slate-50 dark:bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {approval.status === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {approval.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {approval.status === 'approved' ? 'Approved' : 'Rejected'} • {' '}
                          {format(new Date(approval.approved_at || approval.rejected_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {getItemTypeLabel(approval.item_type)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {approvals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              All Caught Up!
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              No pending approvals at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-white dark:bg-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve {selectedApproval?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-400">
                By approving, you authorize MCI to proceed with this work as described.
              </p>
            </div>

            {selectedApproval?.amount && (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-green-600">
                  ${selectedApproval.amount.toLocaleString()}
                </p>
              </div>
            )}

            <SignaturePad
              label="Sign to Approve"
              value={signature}
              onChange={setSignature}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => approveMutation.mutate({
                  approval_id: selectedApproval.id,
                  signature_data_url: signature
                })}
                disabled={!signature || approveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? 'Processing...' : 'Approve & Sign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Reject {selectedApproval?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                Please provide a reason for rejection so the team can address your concerns.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Reason for Rejection
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why you're rejecting this..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => rejectMutation.mutate({
                  approval_id: selectedApproval.id,
                  rejection_reason: rejectionReason
                })}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectMutation.isPending ? 'Processing...' : 'Submit Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}