import React, { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DollarSign, CheckCircle, XCircle, Eye, Search, Filter } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'sonner';

export default function CommissionManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);
  const [actionDialog, setActionDialog] = useState(null); // { action: 'approve'/'cancel', record }
  const [actionReason, setActionReason] = useState('');

  // Fetch current user (admin check)
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch all commissions (admin only)
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['allCommissions'],
    queryFn: async () => {
      return base44.entities.CommissionRecord.list('-calculation_date', 500);
    },
    enabled: user?.role === 'admin'
  });

  // Fetch employees for filter
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      return base44.entities.User.list('-created_date', 200);
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (recordId) => {
      return base44.entities.CommissionRecord.update(recordId, {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCommissions']);
      toast.success('Commission approved');
      setActionDialog(null);
    }
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ recordId, reason }) => {
      return base44.entities.CommissionRecord.update(recordId, {
        status: 'cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCommissions']);
      toast.success('Commission cancelled');
      setActionDialog(null);
      setActionReason('');
    }
  });

  // Filter commissions
  const filteredCommissions = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (employeeFilter !== 'all' && c.user_id !== employeeFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        c.employee_name?.toLowerCase().includes(search) ||
        c.trigger_entity_number?.toLowerCase().includes(search) ||
        c.employee_email?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Calculate totals
  const totals = filteredCommissions.reduce((acc, c) => {
    acc.total += c.commission_amount || 0;
    if (c.status === 'pending') acc.pending += c.commission_amount || 0;
    if (c.status === 'approved') acc.approved += c.commission_amount || 0;
    if (c.status === 'paid') acc.paid += c.commission_amount || 0;
    return acc;
  }, { total: 0, pending: 0, approved: 0, paid: 0 });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    clawed_back: 'bg-red-100 text-red-800'
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Only administrators can access commission management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Commission Management</h1>
        <p className="text-gray-600">Review and approve commission records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">${totals.total.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">${totals.pending.toFixed(2)}</p>
              </div>
              <Badge className={statusColors.pending}>
                {commissions.filter(c => c.status === 'pending').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">${totals.approved.toFixed(2)}</p>
              </div>
              <Badge className={statusColors.approved}>
                {commissions.filter(c => c.status === 'approved').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">${totals.paid.toFixed(2)}</p>
              </div>
              <Badge className={statusColors.paid}>
                {commissions.filter(c => c.status === 'paid').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by employee or invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="flex items-center text-sm text-gray-600">
              {filteredCommissions.length} records
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Commission List */}
      <div className="space-y-3">
        {filteredCommissions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No commissions found matching your filters</p>
            </CardContent>
          </Card>
        )}

        {filteredCommissions.map(commission => (
          <Card key={commission.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {commission.employee_name}
                    </h3>
                    <Badge className={statusColors[commission.status]}>
                      {commission.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Invoice: </span>
                      <span className="text-gray-900 font-medium">
                        {commission.trigger_entity_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date: </span>
                      <span className="text-gray-900">
                        {formatDate(commission.calculation_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rule: </span>
                      <span className="text-gray-900">{commission.rule_snapshot?.rule_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ${commission.commission_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailRecord(commission)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {commission.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setActionDialog({ action: 'approve', record: commission })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setActionDialog({ action: 'cancel', record: commission })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog (same as MyCommissions) */}
      {detailRecord && (
        <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Commission Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Commission Amount</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${detailRecord.commission_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {detailRecord.employee_name} ({detailRecord.employee_email})
                  </p>
                </div>
                <Badge className={statusColors[detailRecord.status]} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  {detailRecord.status}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Calculation Formula</h4>
                <p className="text-gray-700 font-mono text-sm bg-gray-50 p-3 rounded">
                  {detailRecord.calculation_formula}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Calculation Inputs (Snapshot)</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(detailRecord.calculation_inputs, null, 2)}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Commission Rule (Snapshot)</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(detailRecord.rule_snapshot, null, 2)}
                  </pre>
                </div>
              </div>

              {detailRecord.cancellation_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-semibold text-red-900 mb-1">Cancellation Reason</h4>
                  <p className="text-sm text-red-800">{detailRecord.cancellation_reason}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Dialog */}
      {actionDialog && (
        <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'approve' ? 'Approve Commission' : 'Cancel Commission'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-semibold">{actionDialog.record.employee_name}</p>
                <p className="text-sm text-gray-600 mt-2">Amount</p>
                <p className="text-2xl font-bold">${actionDialog.record.commission_amount.toFixed(2)}</p>
              </div>

              {actionDialog.action === 'cancel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason *
                  </label>
                  <Textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Explain why this commission is being cancelled..."
                    rows={3}
                  />
                </div>
              )}

              {actionDialog.action === 'approve' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    This commission will be marked as approved and ready for payout.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
                onClick={() => {
                  if (actionDialog.action === 'approve') {
                    approveMutation.mutate(actionDialog.record.id);
                  } else {
                    if (!actionReason.trim()) {
                      toast.error('Please provide a cancellation reason');
                      return;
                    }
                    cancelMutation.mutate({
                      recordId: actionDialog.record.id,
                      reason: actionReason
                    });
                  }
                }}
                disabled={approveMutation.isPending || cancelMutation.isPending}
              >
                {actionDialog.action === 'approve' ? 'Approve' : 'Cancel Commission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}