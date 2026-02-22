import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, DollarSign, TrendingUp, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo';

  // Fetch data
  // STRATEGY FIX: add staleTime to prevent refetch on every mount
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-revenue'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 1000),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: payrollPreviews = [] } = useQuery({
    queryKey: ['payroll-previews-exec'],
    queryFn: () => base44.entities.PayrollImportPreview.filter({ status: 'confirmed' }, '-created_at', 200),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: taxProfiles = [] } = useQuery({
    queryKey: ['all-tax-profiles'],
    queryFn: () => base44.entities.TaxProfile.filter({ completed: true }),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => base44.entities.EmployeeDirectory.list(),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['all-jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 1000),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['all-expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 1000),
    enabled: isAdmin,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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

  // Payroll from confirmed PayrollImportPreview records
  const filteredPayroll = filterByDate(payrollPreviews, 'created_at');
  const totalPayrollExposure = filteredPayroll.reduce((sum, p) => {
    const summary = p.payload?.summary;
    return sum + (summary?.total_gross_pay || summary?.total_pay || 0);
  }, 0);

  // Commissions: not available as standalone entity — show zeros until commission system is wired
  const totalCommissionsCalculated = 0;
  const totalCommissionsApproved = 0;
  const totalCommissionsPaid = 0;
  const commissionsCalculated = [];
  const commissionsApproved = [];
  const commissionsPaid = [];

  const activeEmployees = allEmployees.filter(e => e.status === 'active');
  // taxProfiles query already filters completed:true, so count directly
  const taxCompliant = taxProfiles.length;
  const taxComplianceRate = activeEmployees.length > 0 
    ? ((taxCompliant / activeEmployees.length) * 100).toFixed(1)
    : 0;

  // Job pipeline metrics
  const activeJobs = jobs.filter(j => j.status === 'active' && !j.deleted_at);
  const completedJobs = jobs.filter(j => j.status === 'completed' && !j.deleted_at);
  const avgJobProfit = completedJobs.length > 0 
    ? completedJobs.reduce((sum, j) => {
        // Use real_cost if available, fallback to estimated_cost
        const revenue = j.contract_amount || 0;
        const cost = j.real_cost ?? j.estimated_cost ?? 0;
        return sum + (revenue - cost);
      }, 0) / completedJobs.length
    : 0;

  // Cost breakdown
  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const totalExpenses = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Net profit
  const netProfit = totalRevenue - totalPayrollExposure - totalCommissionsPaid - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

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

        {/* Job Pipeline Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 text-sm">
                <TrendingUp className="w-4 h-4" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-700">{activeJobs.length}</p>
              <p className="text-xs text-slate-600 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                Completed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">{completedJobs.length}</p>
              <p className="text-xs text-slate-600 mt-1">Total delivered</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 text-sm">
                <DollarSign className="w-4 h-4" />
                Avg Job Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-700">
                ${avgJobProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-600 mt-1">Per completed job</p>
            </CardContent>
          </Card>
        </div>

        {/* Net Profit & Margin */}
        <Card className={`border-2 ${
          netProfit > 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Net Profit & Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Net Profit</p>
                <p className={`text-4xl font-bold ${netProfit > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Revenue - Payroll - Commissions - Expenses
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Profit Margin</p>
                <p className={`text-4xl font-bold ${parseFloat(profitMargin) > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {profitMargin}%
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  (Net Profit / Revenue) × 100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Payroll</span>
                <span className="text-lg font-bold text-slate-900">
                  ${totalPayrollExposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Commissions Paid</span>
                <span className="text-lg font-bold text-slate-900">
                  ${totalCommissionsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Expenses</span>
                <span className="text-lg font-bold text-slate-900">
                  ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-t-2 border-slate-300">
                <span className="text-sm font-bold">Total Costs</span>
                <span className="text-xl font-bold text-red-700">
                  ${(totalPayrollExposure + totalCommissionsPaid + totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
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