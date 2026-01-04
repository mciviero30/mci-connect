import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, DollarSign, TrendingUp, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';

export default function ExecutiveDashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo';

  // Fetch data
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-revenue'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 1000),
    enabled: isAdmin,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['all-commissions'],
    queryFn: () => base44.entities.CommissionResult.list('-created_date', 1000),
    enabled: isAdmin,
  });

  const { data: payrollEntries = [] } = useQuery({
    queryKey: ['payroll-entries'],
    queryFn: () => base44.entities.WeeklyPayroll.list('-created_date', 1000),
    enabled: isAdmin,
  });

  const { data: taxProfiles = [] } = useQuery({
    queryKey: ['all-tax-profiles'],
    queryFn: () => base44.entities.TaxProfile.list(),
    enabled: isAdmin,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => base44.entities.EmployeeDirectory.list(),
    enabled: isAdmin,
  });

  // Filter by date range
  const filterByDate = (items, dateField) => {
    let filtered = items;
    if (startDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate <= new Date(endDate);
      });
    }
    return filtered;
  };

  // Calculate metrics
  const filteredInvoices = filterByDate(invoices.filter(inv => inv.status === 'paid'), 'payment_date');
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

  const filteredCommissions = filterByDate(commissions, 'created_date');
  const commissionsCalculated = filteredCommissions.filter(c => c.status === 'calculated');
  const commissionsApproved = filteredCommissions.filter(c => c.status === 'approved');
  const commissionsPaid = filteredCommissions.filter(c => c.status === 'paid');

  const totalCommissionsCalculated = commissionsCalculated.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const totalCommissionsApproved = commissionsApproved.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const totalCommissionsPaid = commissionsPaid.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const filteredPayroll = filterByDate(payrollEntries, 'created_date');
  const totalPayrollExposure = filteredPayroll.reduce((sum, p) => sum + (p.total_pay || 0), 0);

  const activeEmployees = allEmployees.filter(e => e.employment_status === 'active');
  const taxCompliant = taxProfiles.filter(t => t.completed).length;
  const taxComplianceRate = activeEmployees.length > 0 
    ? ((taxCompliant / activeEmployees.length) * 100).toFixed(1)
    : 0;

  if (!isAdmin) {
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
              Only CEOs and Administrators can access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Executive Dashboard</h1>
          <p className="text-slate-600">Real-time business intelligence and KPIs</p>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Period Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue KPI */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <DollarSign className="w-6 h-6" />
              Total Revenue
              <div className="ml-auto">
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs cursor-help">
                    ?
                  </div>
                  <div className="absolute right-0 top-6 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                    Revenue from all paid invoices in the selected period
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-700">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              From {filteredInvoices.length} paid invoice{filteredInvoices.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Commissions KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 text-sm">
                <Clock className="w-4 h-4" />
                Pending Review
                <div className="ml-auto">
                  <div className="group relative">
                    <div className="w-3 h-3 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center text-[10px] cursor-help">
                      ?
                    </div>
                    <div className="absolute right-0 top-5 w-48 bg-slate-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Commissions calculated but not yet approved
                    </div>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-700">
                ${totalCommissionsCalculated.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {commissionsCalculated.length} commission{commissionsCalculated.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Approved - Awaiting Payment
                <div className="ml-auto">
                  <div className="group relative">
                    <div className="w-3 h-3 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] cursor-help">
                      ?
                    </div>
                    <div className="absolute right-0 top-5 w-48 bg-slate-900 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                      Approved commissions ready to be paid
                    </div>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-700">
                ${totalCommissionsApproved.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {commissionsApproved.length} commission{commissionsApproved.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">
                ${totalCommissionsPaid.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {commissionsPaid.length} commission{commissionsPaid.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Exposure */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <TrendingUp className="w-6 h-6" />
              Payroll Exposure
              <div className="ml-auto">
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs cursor-help">
                    ?
                  </div>
                  <div className="absolute right-0 top-6 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                    Total payroll cost (including commissions) in the selected period
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-700">
              ${totalPayrollExposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              From {filteredPayroll.length} payroll entr{filteredPayroll.length !== 1 ? 'ies' : 'y'}
            </p>
          </CardContent>
        </Card>

        {/* Tax Compliance */}
        <Card className={`border-2 ${
          parseFloat(taxComplianceRate) >= 90 
            ? 'border-green-300 bg-green-50' 
            : parseFloat(taxComplianceRate) >= 70 
              ? 'border-yellow-300 bg-yellow-50' 
              : 'border-red-300 bg-red-50'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Tax Compliance Rate
              <div className="ml-auto">
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs cursor-help">
                    ?
                  </div>
                  <div className="absolute right-0 top-6 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                    Percentage of active employees with completed W-9/W-4 tax profiles
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-4xl font-bold ${
                  parseFloat(taxComplianceRate) >= 90 
                    ? 'text-green-700' 
                    : parseFloat(taxComplianceRate) >= 70 
                      ? 'text-yellow-700' 
                      : 'text-red-700'
                }`}>
                  {taxComplianceRate}%
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {taxCompliant} of {activeEmployees.length} active employees compliant
                </p>
              </div>
              {parseFloat(taxComplianceRate) < 100 && (
                <div className="text-right">
                  <p className="text-xs text-red-600 font-medium">
                    {activeEmployees.length - taxCompliant} employee{activeEmployees.length - taxCompliant !== 1 ? 's' : ''} missing tax info
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}