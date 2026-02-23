import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Plus, Lock, CheckCircle, DollarSign, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { createPageUrl } from '@/utils';

const statusBadgeConfig = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-800' },
  locked: { label: 'Locked', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' }
};

// ==================== CREATE BATCH MODAL ====================
const CreateBatchModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ period_start: '', period_end: '' });
  const toast = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.asServiceRole.entities.PayrollBatch.create({
        period_start: data.period_start,
        period_end: data.period_end,
        status: 'draft'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Batch created');
      setFormData({ period_start: '', period_end: '' });
      onClose();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Payroll Batch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Period Start</label>
            <Input
              type="date"
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Period End</label>
            <Input
              type="date"
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.period_start || !formData.period_end || createMutation.isPending}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Batch'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== CONFIRMATION DIALOG ====================
const ConfirmActionDialog = ({ open, title, description, onConfirm, isLoading, onCancel }) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Confirm'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ==================== BATCH DETAIL VIEW ====================
const BatchDetailView = ({ batch, onBack, onActionSuccess }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch allocations
  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ['payrollAllocations', batch.id],
    queryFn: async () => {
      const allocs = await base44.asServiceRole.entities.PayrollAllocation.filter(
        { batch_id: batch.id },
        '',
        1000
      );

      // Enrich with employee names
      const enriched = await Promise.all(
        (allocs || []).map(async (alloc) => {
          const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
            { id: alloc.employee_profile_id },
            '',
            1
          );
          const profile = profiles?.[0];
          const user = profile?.user_id
            ? (await base44.asServiceRole.entities.User.filter({ id: profile.user_id }, '', 1))?.[0]
            : null;

          return {
            ...alloc,
            employee_name: user?.full_name || profile?.first_name || 'Unknown'
          };
        })
      );
      return enriched;
    },
    enabled: !!batch.id
  });

  // State machine mutations
  const generateMutation = useMutation({
    mutationFn: () =>
      base44.asServiceRole.functions.invoke('generatePayrollBatch', { batch_id: batch.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      queryClient.invalidateQueries({ queryKey: ['payrollAllocations', batch.id] });
      toast.success('Payroll generated');
      onActionSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      base44.asServiceRole.functions.invoke('lockPayrollBatch', { batch_id: batch.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Batch locked');
      setConfirmAction(null);
      onActionSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      base44.asServiceRole.functions.invoke('approvePayrollBatch', { batch_id: batch.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Batch approved');
      setConfirmAction(null);
      onActionSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      base44.asServiceRole.functions.invoke('markPayrollBatchPaid', { batch_id: batch.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      queryClient.invalidateQueries({ queryKey: ['payrollAllocations', batch.id] });
      toast.success('Batch marked as paid');
      setConfirmAction(null);
      onActionSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>← Back to Batches</Button>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${batch.total_gross?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regular Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.total_regular_hours?.toFixed(1) || '0.0'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.total_overtime_hours?.toFixed(1) || '0.0'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${batch.total_commissions?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>
      </div>

      {/* State Machine Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {batch.status === 'draft' && (
              <>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate Payroll'}
                </Button>
                <Button
                  onClick={() => setConfirmAction('lock')}
                  disabled={lockMutation.isPending}
                  variant="outline"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Batch
                </Button>
              </>
            )}
            {batch.status === 'locked' && (
              <Button
                onClick={() => setConfirmAction('approve')}
                disabled={approveMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Batch
              </Button>
            )}
            {batch.status === 'approved' && (
              <Button
                onClick={() => setConfirmAction('pay')}
                disabled={markPaidMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            {batch.status === 'paid' && (
              <p className="text-sm text-slate-500">Batch completed and paid</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allocations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Allocations ({allocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allocLoading ? (
            <p className="text-slate-500">Loading allocations...</p>
          ) : allocations.length === 0 ? (
            <p className="text-slate-500">No allocations yet. Generate payroll to create allocations.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Regular Hours</TableHead>
                    <TableHead className="text-right">Overtime Hours</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">{alloc.employee_name}</TableCell>
                      <TableCell className="text-right">{alloc.regular_hours?.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{alloc.overtime_hours?.toFixed(1)}</TableCell>
                      <TableCell className="text-right">${alloc.commission_total?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${alloc.gross_pay?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmActionDialog
        open={confirmAction === 'lock'}
        title="Lock Batch"
        description="Once locked, this batch cannot be modified. Proceed?"
        onConfirm={() => lockMutation.mutate()}
        isLoading={lockMutation.isPending}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmActionDialog
        open={confirmAction === 'approve'}
        title="Approve Batch"
        description="This batch will be marked for payment. Proceed?"
        onConfirm={() => approveMutation.mutate()}
        isLoading={approveMutation.isPending}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmActionDialog
        open={confirmAction === 'pay'}
        title="Mark as Paid"
        description="This will finalize all employee payments. Proceed?"
        onConfirm={() => markPaidMutation.mutate()}
        isLoading={markPaidMutation.isPending}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};

// ==================== MAIN PAGE ====================
export default function PayrollDashboard() {
  const { t } = useLanguage();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Check admin access
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo';

  if (currentUser && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Payroll Dashboard is restricted to administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch batches
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['payrollBatches'],
    queryFn: async () => {
      const result = await base44.asServiceRole.entities.PayrollBatch.list('-period_start', 100);
      return result || [];
    }
  });

  if (selectedBatch) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-6">
          <BatchDetailView
            batch={selectedBatch}
            onBack={() => setSelectedBatch(null)}
            onActionSuccess={() => {
              const updated = batches.find(b => b.id === selectedBatch.id);
              if (updated) setSelectedBatch({ ...updated });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-xl shadow-md">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Payroll Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-400">Manage payroll batches and allocations</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-slate-500">Loading batches...</p>
            ) : batches.length === 0 ? (
              <p className="text-slate-500">No payroll batches yet. Create one to begin.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Regular Hours</TableHead>
                      <TableHead className="text-right">Overtime Hours</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const config = statusBadgeConfig[batch.status];
                      return (
                        <TableRow key={batch.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                          <TableCell
                            onClick={() => setSelectedBatch(batch)}
                            className="font-medium"
                          >
                            {batch.period_start} to {batch.period_end}
                          </TableCell>
                          <TableCell onClick={() => setSelectedBatch(batch)}>
                            <Badge className={config.className}>{config.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={() => setSelectedBatch(batch)}>
                            {batch.total_regular_hours?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell className="text-right" onClick={() => setSelectedBatch(batch)}>
                            {batch.total_overtime_hours?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell className="text-right" onClick={() => setSelectedBatch(batch)}>
                            ${batch.total_commissions?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="text-right font-bold" onClick={() => setSelectedBatch(batch)}>
                            ${batch.total_gross?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedBatch(batch)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Batch Modal */}
        <CreateBatchModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      </div>
    </div>
  );
}