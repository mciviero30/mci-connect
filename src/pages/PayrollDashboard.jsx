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
import { Banknote, Plus, Lock, CheckCircle, DollarSign, Shield, Upload, FileText, Download, Calculator, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { exportPayrollBatchCSV } from '@/functions/exportPayrollBatchCSV';
import { exportPayrollBatchPDF } from '@/functions/exportPayrollBatchPDF';
import { calculatePayrollTaxes } from '@/functions/calculatePayrollTaxes';

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
      return await base44.entities.PayrollBatch.create({
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

// ==================== IMPORT HISTORICAL MODAL ====================
const ImportHistoricalModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ period_start: '', period_end: '', csvFile: null });
  const [preview, setPreview] = useState(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData({ ...formData, csvFile: file });

    // Parse CSV for preview
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',') || [];
    const data = lines.slice(1, 4).map(line => line.split(','));
    setPreview({ headers, data });
  };

  const importMutation = useMutation({
    mutationFn: async (data) => {
      const fileContent = await data.csvFile.text();
      return await base44.functions.invoke('importHistoricalPayrollBatch', {
        period_start: data.period_start,
        period_end: data.period_end,
        csv_content: fileContent
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Historical payroll imported');
      onSuccess(result.batch_id);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Historical Payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="text-sm font-medium">CSV File (employee_id, regular_hours, overtime_hours, commission_total)</label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {preview && (
            <div className="border rounded p-4 bg-slate-50">
              <p className="text-sm font-medium mb-2">Preview (first 3 rows)</p>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th key={i} className="border px-2 py-1 text-left">{h.trim()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="border px-2 py-1">{cell.trim()}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => importMutation.mutate(formData)}
              disabled={!formData.period_start || !formData.period_end || !formData.csvFile || importMutation.isPending}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
            >
              {importMutation.isPending ? 'Importing...' : 'Import Batch'}
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

// ==================== EMPLOYEE DRILLDOWN MODAL ====================
const EmployeeDrilldownModal = ({ alloc, onClose }) => {
  if (!alloc) return null;
  return (
    <Dialog open={!!alloc} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alloc.employee_name} — Allocation Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Regular Hours</p>
              <p className="text-lg font-bold">{alloc.regular_hours?.toFixed(1)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Overtime Hours</p>
              <p className="text-lg font-bold">{alloc.overtime_hours?.toFixed(1)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-500">Hourly Rate (Snapshot)</p>
              <p className="text-lg font-bold">${alloc.hourly_rate_snapshot?.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-xs text-slate-500">OT Multiplier (Snapshot)</p>
              <p className="text-lg font-bold">{alloc.overtime_multiplier_snapshot}×</p>
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Regular Pay</span>
              <span>${alloc.regular_pay?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Overtime Pay</span>
              <span>${alloc.overtime_pay?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Commission</span>
              <span>${alloc.commission_total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Gross Pay</span>
              <span>${alloc.gross_pay?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== BATCH DETAIL VIEW ====================
const BatchDetailView = ({ batch, onBack, onActionSuccess }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState(null);
  const [drilldownAlloc, setDrilldownAlloc] = useState(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Fetch allocations with batch loaded employee data (NO N+1)
  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ['payrollAllocations', batch.id],
    queryFn: async () => {
      const allocs = await base44.entities.PayrollAllocation.filter(
        { batch_id: batch.id },
        '',
        1000
      );

      // Extract unique profile IDs
      const uniqueProfileIds = [...new Set((allocs || []).map(a => a.employee_profile_id))];

      // Batch fetch profiles
      const profiles = await Promise.all(
        uniqueProfileIds.map(pid =>
          base44.entities.EmployeeProfile.filter({ id: pid }, '', 1).then(p => p?.[0])
        )
      );

      // Extract unique user IDs
      const uniqueUserIds = [...new Set(profiles.filter(Boolean).map(p => p.user_id))];

      // Batch fetch users
      const users = await Promise.all(
        uniqueUserIds.map(uid =>
          base44.entities.User.filter({ id: uid }, '', 1).then(u => u?.[0])
        )
      );

      // Create lookup maps
      const profileMap = Object.fromEntries(profiles.filter(Boolean).map(p => [p.id, p]));
      const userMap = Object.fromEntries(users.filter(Boolean).map(u => [u.id, u]));

      // Enrich allocations locally
      return (allocs || []).map(alloc => {
        const profile = profileMap[alloc.employee_profile_id];
        const user = profile ? userMap[profile.user_id] : null;
        return {
          ...alloc,
          employee_name: user?.full_name || profile?.first_name || 'Unknown'
        };
      });
    },
    enabled: !!batch.id
  });

  // Fetch audit log
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['payrollAuditLog', batch.id],
    queryFn: async () => {
      const logs = await base44.entities.PayrollAuditLog.filter({ batch_id: batch.id }, '-timestamp', 50);
      if (!logs || logs.length === 0) return [];
      // Enrich with user names
      const userIds = [...new Set(logs.map(l => l.performed_by_user_id))];
      const users = await Promise.all(
        userIds.map(uid => base44.entities.User.filter({ id: uid }, '', 1).then(r => r?.[0]))
      );
      const userMap = Object.fromEntries(users.filter(Boolean).map(u => [u.id, u]));
      return logs.map(l => ({ ...l, performed_by_name: userMap[l.performed_by_user_id]?.full_name || 'Unknown' }));
    },
    enabled: !!batch.id
  });

  // Export handlers
  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const res = await exportPayrollBatchCSV({ batch_id: batch.id });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${batch.period_start}_${batch.period_end}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const res = await exportPayrollBatchPDF({ batch_id: batch.id });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${batch.period_start}_${batch.period_end}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExportingPDF(false);
    }
  };

  // Refetch selected batch explicitly
  const refetchBatch = async () => {
    const updated = await base44.entities.PayrollBatch.filter({ id: batch.id }, '', 1);
    return updated?.[0];
  };

  // State machine mutations
  const generateMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('generatePayrollBatch', { batch_id: batch.id }),
    onSuccess: async () => {
      const refreshedBatch = await refetchBatch();
      queryClient.invalidateQueries({ queryKey: ['payrollAllocations', batch.id] });
      toast.success('Payroll generated');
      onActionSuccess(refreshedBatch);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('lockPayrollBatch', { batch_id: batch.id }),
    onSuccess: async () => {
      const refreshedBatch = await refetchBatch();
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Batch locked');
      setConfirmAction(null);
      onActionSuccess(refreshedBatch);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('approvePayrollBatch', { batch_id: batch.id }),
    onSuccess: async () => {
      const refreshedBatch = await refetchBatch();
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      toast.success('Batch approved');
      setConfirmAction(null);
      onActionSuccess(refreshedBatch);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('markPayrollBatchPaid', { batch_id: batch.id }),
    onSuccess: async () => {
      const refreshedBatch = await refetchBatch();
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
      queryClient.invalidateQueries({ queryKey: ['payrollAllocations', batch.id] });
      toast.success('Batch marked as paid');
      setConfirmAction(null);
      onActionSuccess(refreshedBatch);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>← Back to Batches</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={exportingCSV}>
            <Download className="w-4 h-4 mr-2" />
            {exportingCSV ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={exportingPDF}>
            <FileText className="w-4 h-4 mr-2" />
            {exportingPDF ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

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
                    <TableRow
                      key={alloc.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => setDrilldownAlloc(alloc)}
                    >
                      <TableCell className="font-medium text-blue-700 underline">{alloc.employee_name}</TableCell>
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

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-slate-500 text-sm">No audit entries yet.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge className={
                      log.action === 'generate' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'lock' ? 'bg-amber-100 text-amber-800' :
                      log.action === 'approve' ? 'bg-purple-100 text-purple-800' :
                      log.action === 'pay' ? 'bg-green-100 text-green-800' :
                      'bg-slate-100 text-slate-800'
                    }>
                      {log.action}
                    </Badge>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{log.performed_by_name}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Drilldown */}
      <EmployeeDrilldownModal alloc={drilldownAlloc} onClose={() => setDrilldownAlloc(null)} />

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const queryClient = useQueryClient();

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
      const result = await base44.entities.PayrollBatch.list('-period_start', 100);
      return result || [];
    }
  });

  const handleBatchDetailActionSuccess = async (refreshedBatch) => {
    if (refreshedBatch) {
      setSelectedBatch(refreshedBatch);
    }
  };

  const handleImportSuccess = async (batchId) => {
    // Refetch batch and navigate to detail view
    const newBatch = await base44.entities.PayrollBatch.filter({ id: batchId }, '', 1);
    if (newBatch?.[0]) {
      setSelectedBatch(newBatch[0]);
      queryClient.invalidateQueries({ queryKey: ['payrollBatches'] });
    }
  };

  if (selectedBatch) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-6">
          <BatchDetailView
            batch={selectedBatch}
            onBack={() => setSelectedBatch(null)}
            onActionSuccess={handleBatchDetailActionSuccess}
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
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Historical
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          </div>
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

        {/* Import Historical Modal */}
        <ImportHistoricalModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      </div>
    </div>
  );
}