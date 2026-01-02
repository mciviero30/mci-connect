import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  CheckCircle, 
  Clock,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  CreditCard
} from 'lucide-react';
import { canManageAllAgreements } from '@/components/commission/commissionPermissions';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CommissionReview() {
  const queryClient = useQueryClient();
  const [selectedResult, setSelectedResult] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [adjustedRate, setAdjustedRate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { profile: userProfile } = useEmployeeProfile(currentUser?.email, currentUser);
  const canManageAll = canManageAllAgreements(userProfile);

  // Fetch commission results
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['commissionResults'],
    queryFn: () => base44.entities.CommissionResult.list('-calculation_date', 100),
    enabled: canManageAll,
  });

  // Approve commission mutation (server-side validation)
  const approveMutation = useMutation({
    mutationFn: async ({ resultId, adjustedRate, notes }) => {
      const response = await base44.functions.invoke('approveCommission', {
        commission_result_id: resultId,
        adjusted_rate: adjustedRate ? parseFloat(adjustedRate) : undefined,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionResults'] });
      setShowApproveDialog(false);
      setSelectedResult(null);
      setAdjustedRate('');
      setNotes('');
      alert('✅ Commission approved successfully. Payment can now be processed.');
    },
    onError: (error) => {
      alert(error?.response?.data?.error || 'Failed to approve commission');
    }
  });

  // Pay commission mutation (atomic server-side transaction)
  const payMutation = useMutation({
    mutationFn: async (resultId) => {
      const response = await base44.functions.invoke('payCommission', {
        commission_result_id: resultId,
      });
      
      // Check for idempotency error
      if (response.data?.already_paid) {
        throw new Error('This commission has already been paid');
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commissionResults'] });
      setShowPayDialog(false);
      setSelectedResult(null);
      alert(`✅ Commission paid successfully! Amount: $${data.amount_paid?.toLocaleString()}`);
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.error || error.message || 'Failed to pay commission';
      alert(`❌ ${errorMsg}`);
    }
  });

  const handleApproveClick = (result) => {
    setSelectedResult(result);
    setAdjustedRate(result.base_commission_rate.toString());
    setNotes(result.notes || '');
    setShowApproveDialog(true);
  };

  const handlePayClick = (result) => {
    setSelectedResult(result);
    setShowPayDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedResult) return;
    
    // UI Validation
    const rate = parseFloat(adjustedRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Invalid commission rate. Must be between 0 and 100');
      return;
    }
    
    await approveMutation.mutateAsync({
      resultId: selectedResult.id,
      adjustedRate,
      notes,
    });
  };

  const handlePay = async () => {
    if (!selectedResult) return;
    
    // Confirm before paying
    const confirmed = window.confirm(
      `⚠️ Confirm Commission Payment\n\n` +
      `Employee: ${selectedResult.employee_name}\n` +
      `Amount: $${selectedResult.commission_amount?.toLocaleString()}\n\n` +
      `This will create accounting and payroll entries. Continue?`
    );
    
    if (!confirmed) return;
    
    await payMutation.mutateAsync(selectedResult.id);
  };

  // Access denied
  if (currentUser && !canManageAll) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Only CEOs and Administrators can review and approve commissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading commissions...</p>
        </div>
      </div>
    );
  }

  const calculatedResults = results.filter(r => r.status === 'calculated');
  const approvedResults = results.filter(r => r.status === 'approved');
  const paidResults = results.filter(r => r.status === 'paid');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'calculated':
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Approved - Awaiting Payment</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Paid</Badge>;
      case 'invalidated':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commission Review & Approval</h1>
          <p className="text-slate-600">Review and approve calculated commissions for completed jobs</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Review</p>
                  <p className="text-2xl font-bold text-slate-900">{calculatedResults.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Approved</p>
                  <p className="text-2xl font-bold text-slate-900">{approvedResults.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Paid</p>
                  <p className="text-2xl font-bold text-slate-900">{paidResults.length}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Review */}
        {calculatedResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-yellow-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-600" />
                Pending Review
                <Badge className="bg-yellow-100 text-yellow-800">{calculatedResults.length}</Badge>
              </h2>
            </div>
            <div className="grid gap-4">
              {calculatedResults.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{result.job_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {result.employee_name} ({result.employee_email})
                        </CardDescription>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Job Revenue</p>
                        <p className="font-semibold text-green-600">${result.job_revenue?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Total Expenses</p>
                        <p className="font-semibold text-red-600">${result.job_expenses?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Net Profit</p>
                        <p className="font-semibold text-blue-600">${result.net_profit?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission ({result.base_commission_rate}%)</p>
                        <p className="font-semibold text-lg text-indigo-600">${result.commission_amount?.toLocaleString()}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleApproveClick(result)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? 'Processing...' : 'Review & Approve'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Approved (Ready to Pay) */}
        {approvedResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                Approved - Ready to Pay
                <Badge className="bg-blue-100 text-blue-800">{approvedResults.length}</Badge>
              </h2>
            </div>
            <div className="grid gap-4">
              {approvedResults.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{result.job_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {result.employee_name} • Approved by {result.approved_by}
                        </CardDescription>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Net Profit</p>
                        <p className="font-semibold">${result.net_profit?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission Rate</p>
                        <p className="font-semibold">{result.adjusted_commission_rate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission Amount</p>
                        <p className="font-semibold text-lg text-indigo-600">${result.commission_amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Approved</p>
                        <p className="font-semibold text-sm">
                          {result.approved_at ? new Date(result.approved_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handlePayClick(result)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={payMutation.isPending}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {payMutation.isPending ? 'Processing Payment...' : 'Pay Commission'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Paid */}
        {paidResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-green-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-green-600" />
                Paid Commissions
                <Badge className="bg-green-100 text-green-800">{paidResults.length}</Badge>
              </h2>
            </div>
            <div className="grid gap-4">
              {paidResults.slice(0, 10).map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{result.job_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {result.employee_name} • Paid by {result.paid_by}
                        </CardDescription>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Amount Paid</p>
                        <p className="font-semibold text-lg">${result.commission_amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Paid Date</p>
                        <p className="font-semibold">
                          {result.paid_at ? new Date(result.paid_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Commission Rate</p>
                        <p className="font-semibold">{result.adjusted_commission_rate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Commissions Found</h3>
              <p className="text-slate-600">
                Commission results will appear here when jobs are completed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review & Approve Commission</DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              Review the calculation and adjust the rate if needed. Approving will allow payment processing.
            </p>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Important:</strong> Review the calculation details and adjust the commission rate if needed before approving. 
                  Once approved, the commission will be ready for payment.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Job</p>
                  <p className="font-semibold">{selectedResult.job_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Employee</p>
                  <p className="font-semibold">{selectedResult.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Net Profit</p>
                  <p className="font-semibold text-lg">${selectedResult.net_profit?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Base Rate</p>
                  <p className="font-semibold">{selectedResult.base_commission_rate}%</p>
                </div>
              </div>

              <div>
                <Label>Adjust Commission Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={adjustedRate}
                  onChange={(e) => setAdjustedRate(e.target.value)}
                />
                <p className="text-sm text-slate-600 mt-1">
                  New amount: ${((selectedResult.net_profit * (parseFloat(adjustedRate) || 0) / 100)).toLocaleString()}
                </p>
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve Commission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Pay Commission - Critical Action</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Warning:</strong> This will create a payroll entry and accounting transaction. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Employee:</span>
                  <span className="font-semibold">{selectedResult.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Job:</span>
                  <span className="font-semibold">{selectedResult.job_name}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-indigo-600">${selectedResult.commission_amount?.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Confirm that you want to process this commission payment.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePay}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={payMutation.isPending}
            >
              {payMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}