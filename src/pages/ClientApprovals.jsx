import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { requestClientApproval } from '@/functions/requestClientApproval';
import { useToast } from '@/components/ui/toast';

export default function ClientApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Fetch all approval requests
  const { data: approvals = [] } = useQuery({
    queryKey: ['all-approvals'],
    queryFn: () => base44.entities.ClientApproval.list('-requested_at', 100),
    enabled: isAdmin,
  });

  // Fetch pending quotes/change orders
  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['pending-quotes'],
    queryFn: () => base44.entities.Quote.filter({ status: 'sent' }),
    enabled: isAdmin,
  });

  const { data: pendingChangeOrders = [] } = useQuery({
    queryKey: ['pending-change-orders'],
    queryFn: () => base44.entities.ChangeOrder.filter({ approval_status: 'pending_approval' }),
    enabled: isAdmin,
  });

  const sendApprovalMutation = useMutation({
    mutationFn: async ({ item_type, item_id, customer_email }) => {
      const response = await requestClientApproval({ item_type, item_id, customer_email });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-approvals']);
      toast({
        title: 'Approval Request Sent',
        description: 'Client has been notified via email',
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

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Only administrators can manage client approvals.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Client Approval Workflow"
          description={`${pendingApprovals.length} pending, ${completedApprovals.length} completed`}
          icon={CheckCircle2}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">Awaiting Client</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-300">
                    {pendingApprovals.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">Approved</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                    {approvals.filter(a => a.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-400">Needs Request</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-300">
                    {pendingQuotes.length + pendingChangeOrders.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Awaiting Approval Request */}
        {(pendingQuotes.length > 0 || pendingChangeOrders.length > 0) && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold">Items Ready to Send for Approval</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{quote.quote_number}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{quote.customer_name} • ${quote.total?.toLocaleString()}</p>
                  </div>
                  <Button
                    onClick={() => sendApprovalMutation.mutate({
                      item_type: 'quote',
                      item_id: quote.id,
                      customer_email: quote.customer_email
                    })}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Request Approval
                  </Button>
                </div>
              ))}

              {pendingChangeOrders.map((co) => (
                <div key={co.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{co.change_order_number}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{co.customer_name} • ${co.change_amount?.toLocaleString()}</p>
                  </div>
                  <Button
                    onClick={() => sendApprovalMutation.mutate({
                      item_type: 'change_order',
                      item_id: co.id,
                      customer_email: co.customer_email
                    })}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Request Approval
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active Approvals */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold">Active Approval Requests</h3>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No pending approvals
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-slate-900 dark:text-white">{approval.title}</p>
                          <Badge className="bg-amber-500 text-white">Pending</Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{approval.customer_name}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>Sent: {format(new Date(approval.requested_at), 'MMM dd, yyyy')}</span>
                          {approval.due_date && (
                            <span>Due: {format(new Date(approval.due_date), 'MMM dd, yyyy')}</span>
                          )}
                          {approval.view_count > 0 && (
                            <span className="text-blue-600">Viewed {approval.view_count}x</span>
                          )}
                        </div>
                      </div>
                      {approval.amount && (
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Amount</p>
                          <p className="text-xl font-bold text-green-600">${approval.amount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        {completedApprovals.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold">Recent Decisions</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedApprovals.slice(0, 10).map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {approval.status === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{approval.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {approval.customer_name} • {format(new Date(approval.approved_at || approval.rejected_at), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    <Badge className={approval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {approval.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}