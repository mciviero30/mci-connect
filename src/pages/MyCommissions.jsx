import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, FileText, Calendar, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function MyCommissions() {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [detailRecord, setDetailRecord] = useState(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch my commissions
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['myCommissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.CommissionRecord.filter({ user_id: user.id }, '-calculation_date');
    },
    enabled: !!user?.id
  });

  // Filter by period
  const filteredCommissions = commissions.filter(c => {
    if (selectedPeriod === 'all') return true;
    const calcDate = new Date(c.calculation_date);
    const now = new Date();
    
    if (selectedPeriod === 'this_month') {
      return calcDate.getMonth() === now.getMonth() && calcDate.getFullYear() === now.getFullYear();
    }
    if (selectedPeriod === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return calcDate.getMonth() === lastMonth.getMonth() && calcDate.getFullYear() === lastMonth.getFullYear();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Commissions</h1>
        <p className="text-gray-600">Track your earnings and commission history</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">${totals.pending.toFixed(2)}</p>
              </div>
              <Badge className={statusColors.pending}>Pending</Badge>
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
              <Badge className={statusColors.approved}>Approved</Badge>
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
              <Badge className={statusColors.paid}>Paid</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">
          {filteredCommissions.length} {filteredCommissions.length === 1 ? 'commission' : 'commissions'}
        </span>
      </div>

      {/* Commission List */}
      <div className="space-y-3">
        {filteredCommissions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No commissions found for this period</p>
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
                      {commission.trigger_entity_number || commission.trigger_entity_id}
                    </h3>
                    <Badge className={statusColors[commission.status]}>
                      {commission.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Date: </span>
                      <span className="text-gray-900">
                        {new Date(commission.calculation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type: </span>
                      <span className="text-gray-900">{commission.trigger_entity_type}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    {commission.calculation_formula}
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ${commission.commission_amount.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailRecord(commission)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      {detailRecord && (
        <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Commission Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Commission Amount</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${detailRecord.commission_amount.toFixed(2)}
                  </p>
                </div>
                <Badge className={statusColors[detailRecord.status]} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  {detailRecord.status}
                </Badge>
              </div>

              {/* Formula */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Calculation Formula</h4>
                <p className="text-gray-700 font-mono text-sm bg-gray-50 p-3 rounded">
                  {detailRecord.calculation_formula}
                </p>
              </div>

              {/* Calculation Inputs */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Calculation Inputs</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Invoice Total:</span>
                    <span className="ml-2 font-semibold">${detailRecord.calculation_inputs?.invoice_total?.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Total Costs:</span>
                    <span className="ml-2 font-semibold">${detailRecord.calculation_inputs?.total_costs?.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Profit:</span>
                    <span className="ml-2 font-semibold text-green-600">${detailRecord.calculation_inputs?.profit?.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Margin:</span>
                    <span className="ml-2 font-semibold">{detailRecord.calculation_inputs?.profit_margin_percent?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Rule Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Commission Rule</h4>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-semibold">{detailRecord.rule_snapshot?.rule_name}</p>
                  <p className="text-sm text-gray-600 mt-1">Model: {detailRecord.rule_snapshot?.commission_model}</p>
                  {detailRecord.rule_snapshot?.rate && (
                    <p className="text-sm text-gray-600">Rate: {(detailRecord.rule_snapshot.rate * 100).toFixed(1)}%</p>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              {detailRecord.status === 'paid' && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Information</h4>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-sm">
                      <span className="text-gray-600">Paid on:</span>
                      <span className="ml-2 font-semibold">
                        {new Date(detailRecord.paid_date).toLocaleDateString()}
                      </span>
                    </p>
                    {detailRecord.paid_via_method && (
                      <p className="text-sm mt-1">
                        <span className="text-gray-600">Method:</span>
                        <span className="ml-2 font-semibold">{detailRecord.paid_via_method}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Read-only Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Commission amounts are automatically calculated and cannot be edited.
                  All calculations are auditable and reproducible.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}