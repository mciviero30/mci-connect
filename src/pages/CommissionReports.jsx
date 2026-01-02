import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Download,
  Shield,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { canManageAllAgreements } from '@/components/commission/commissionPermissions';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';
import CommissionFilters from '@/components/commission/CommissionFilters';
import { exportCommissionCSV } from '@/components/commission/exportCommissionCSV';

export default function CommissionReports() {
  const [filters, setFilters] = useState({
    status: 'all',
    job_id: 'all',
    employee_email: 'all',
    start_date: '',
    end_date: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { profile: userProfile } = useEmployeeProfile(currentUser?.email, currentUser);
  const canManageAll = canManageAllAgreements(userProfile);
  const isManager = userProfile?.role?.toLowerCase() === 'manager';

  // Fetch commission results
  const { data: allResults = [], isLoading } = useQuery({
    queryKey: ['commissionResults'],
    queryFn: () => base44.entities.CommissionResult.list('-calculation_date', 200),
    enabled: !!currentUser,
  });

  // Fetch jobs for filters
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-filters'],
    queryFn: () => base44.entities.Job.list('', 100),
    enabled: canManageAll,
  });

  // Fetch employees for filters
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-filters'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ employment_status: 'active' }),
    enabled: canManageAll,
  });

  // Filter results based on permissions
  const results = useMemo(() => {
    let filtered = allResults;

    // Manager can only see their own
    if (isManager && !canManageAll) {
      filtered = filtered.filter(r => r.employee_email === currentUser?.email);
    }

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.job_id !== 'all') {
      filtered = filtered.filter(r => r.job_id === filters.job_id);
    }

    if (filters.employee_email !== 'all') {
      filtered = filtered.filter(r => r.employee_email === filters.employee_email);
    }

    if (filters.start_date) {
      filtered = filtered.filter(r => {
        const calcDate = new Date(r.calculation_date);
        return calcDate >= new Date(filters.start_date);
      });
    }

    if (filters.end_date) {
      filtered = filtered.filter(r => {
        const calcDate = new Date(r.calculation_date);
        return calcDate <= new Date(filters.end_date);
      });
    }

    return filtered;
  }, [allResults, filters, isManager, canManageAll, currentUser?.email]);

  // Group by job
  const byJob = useMemo(() => {
    const grouped = {};
    results.forEach(r => {
      if (!grouped[r.job_id]) {
        grouped[r.job_id] = {
          job_name: r.job_name,
          results: [],
          total_commission: 0,
          total_paid: 0,
        };
      }
      grouped[r.job_id].results.push(r);
      grouped[r.job_id].total_commission += r.commission_amount || 0;
      if (r.status === 'paid') {
        grouped[r.job_id].total_paid += r.commission_amount || 0;
      }
    });
    return Object.values(grouped);
  }, [results]);

  // Group by manager
  const byManager = useMemo(() => {
    const grouped = {};
    results.forEach(r => {
      if (!grouped[r.employee_email]) {
        grouped[r.employee_email] = {
          employee_name: r.employee_name,
          employee_email: r.employee_email,
          results: [],
          total_commission: 0,
          total_paid: 0,
        };
      }
      grouped[r.employee_email].results.push(r);
      grouped[r.employee_email].total_commission += r.commission_amount || 0;
      if (r.status === 'paid') {
        grouped[r.employee_email].total_paid += r.commission_amount || 0;
      }
    });
    return Object.values(grouped);
  }, [results]);

  // Group by period (month)
  const byPeriod = useMemo(() => {
    const grouped = {};
    results.forEach(r => {
      const date = new Date(r.calculation_date);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[period]) {
        grouped[period] = {
          period,
          results: [],
          total_commission: 0,
          total_paid: 0,
        };
      }
      grouped[period].results.push(r);
      grouped[period].total_commission += r.commission_amount || 0;
      if (r.status === 'paid') {
        grouped[period].total_paid += r.commission_amount || 0;
      }
    });
    return Object.values(grouped).sort((a, b) => b.period.localeCompare(a.period));
  }, [results]);

  const handleExport = (data, filename) => {
    exportCommissionCSV(data, filename);
  };

  // Access denied for non-authorized users
  if (currentUser && !canManageAll && !isManager) {
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
              You don't have permission to view commission reports.
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
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  const totalCommission = results.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
  const totalPaid = results.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.commission_amount || 0), 0);
  const totalPending = results.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.commission_amount || 0), 0);

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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commission Reports</h1>
          <p className="text-slate-600">
            {canManageAll ? 'View and export commission data' : 'View your commission history'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Commission</p>
                  <p className="text-2xl font-bold text-slate-900">${totalCommission.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Awaiting Payment</p>
                  <p className="text-2xl font-bold text-blue-600">${totalPending.toLocaleString()}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <CommissionFilters 
          filters={filters}
          onChange={setFilters}
          jobs={jobs}
          employees={employees}
          showEmployeeFilter={canManageAll}
        />

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Commissions</TabsTrigger>
            {canManageAll && <TabsTrigger value="by-job">By Job</TabsTrigger>}
            {canManageAll && <TabsTrigger value="by-manager">By Manager</TabsTrigger>}
            <TabsTrigger value="by-period">By Period</TabsTrigger>
          </TabsList>

          {/* All Commissions */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Commission Records ({results.length})</CardTitle>
                  <Button 
                    variant="outline"
                    onClick={() => handleExport(results, 'all-commissions.csv')}
                    disabled={results.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.map(result => (
                    <div key={result.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{result.job_name}</p>
                          <p className="text-sm text-slate-600">{result.employee_name}</p>
                        </div>
                        {getStatusBadge(result.status)}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-slate-600">Date:</span>
                          <p className="font-medium">
                            {new Date(result.calculation_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-600">Net Profit:</span>
                          <p className="font-medium">${result.net_profit?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Rate:</span>
                          <p className="font-medium">{result.adjusted_commission_rate}%</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Commission:</span>
                          <p className="font-bold text-indigo-600">${result.commission_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <p className="text-center text-slate-600 py-8">No commission records found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Job */}
          {canManageAll && (
            <TabsContent value="by-job">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Commission by Job ({byJob.length})</CardTitle>
                    <Button 
                      variant="outline"
                      onClick={() => handleExport(results, 'commissions-by-job.csv')}
                      disabled={results.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byJob.map((group, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-slate-900">{group.job_name}</h3>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Total Commission</p>
                            <p className="font-bold text-lg text-indigo-600">${group.total_commission.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-slate-600">Records:</span>
                            <p className="font-medium">{group.results.length}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Total Paid:</span>
                            <p className="font-medium text-green-600">${group.total_paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Awaiting Payment:</span>
                            <p className="font-medium text-blue-600">${(group.total_commission - group.total_paid).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* By Manager */}
          {canManageAll && (
            <TabsContent value="by-manager">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Commission by Manager ({byManager.length})</CardTitle>
                    <Button 
                      variant="outline"
                      onClick={() => handleExport(results, 'commissions-by-manager.csv')}
                      disabled={results.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byManager.map((group, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{group.employee_name}</h3>
                            <p className="text-sm text-slate-600">{group.employee_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Total Commission</p>
                            <p className="font-bold text-lg text-indigo-600">${group.total_commission.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-slate-600">Jobs:</span>
                            <p className="font-medium">{group.results.length}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Total Paid:</span>
                            <p className="font-medium text-green-600">${group.total_paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Awaiting Payment:</span>
                            <p className="font-medium text-blue-600">${(group.total_commission - group.total_paid).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* By Period */}
          <TabsContent value="by-period">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Commission by Period ({byPeriod.length})</CardTitle>
                  <Button 
                    variant="outline"
                    onClick={() => handleExport(results, 'commissions-by-period.csv')}
                    disabled={results.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {byPeriod.map((group, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900">{group.period}</h3>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">Total Commission</p>
                          <p className="font-bold text-lg text-indigo-600">${group.total_commission.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-600">Commissions:</span>
                          <p className="font-medium">{group.results.length}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Total Paid:</span>
                          <p className="font-medium text-green-600">${group.total_paid.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Pending:</span>
                          <p className="font-medium text-yellow-600">${(group.total_commission - group.total_paid).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}