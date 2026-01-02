import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Shield, AlertCircle, DollarSign } from 'lucide-react';
import { canManageAllAgreements } from '@/components/commission/commissionPermissions';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';

export default function CommissionTotalsGusto() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { profile: userProfile } = useEmployeeProfile(currentUser?.email, currentUser);
  const canManageAll = canManageAllAgreements(userProfile);

  // Fetch PAID commissions only
  const { data: paidCommissions = [], isLoading } = useQuery({
    queryKey: ['paid-commissions'],
    queryFn: async () => {
      const results = await base44.entities.CommissionResult.filter({ status: 'paid' });
      return results.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    },
    enabled: canManageAll,
  });

  // Filter by date range
  const filteredCommissions = useMemo(() => {
    let filtered = paidCommissions;

    if (startDate) {
      filtered = filtered.filter(c => {
        const paidDate = new Date(c.paid_at);
        return paidDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter(c => {
        const paidDate = new Date(c.paid_at);
        return paidDate <= new Date(endDate);
      });
    }

    return filtered;
  }, [paidCommissions, startDate, endDate]);

  // Group by employee
  const employeeTotals = useMemo(() => {
    const grouped = {};
    
    filteredCommissions.forEach(comm => {
      if (!grouped[comm.employee_email]) {
        grouped[comm.employee_email] = {
          employee_name: comm.employee_name,
          employee_email: comm.employee_email,
          total_commission: 0,
          job_count: 0,
          commissions: [],
        };
      }
      
      grouped[comm.employee_email].total_commission += comm.commission_amount || 0;
      grouped[comm.employee_email].job_count += 1;
      grouped[comm.employee_email].commissions.push(comm);
    });

    return Object.values(grouped).sort((a, b) => 
      a.employee_name.localeCompare(b.employee_name)
    );
  }, [filteredCommissions]);

  const exportCSV = () => {
    if (employeeTotals.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Employee Name',
      'Employee Email',
      'Period Start',
      'Period End',
      'Total Commission',
      'Number of Jobs',
    ];

    const rows = employeeTotals.map(emp => [
      emp.employee_name,
      emp.employee_email,
      startDate || 'All time',
      endDate || 'All time',
      emp.total_commission.toFixed(2),
      emp.job_count,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `commission-totals-gusto-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Access control
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
              Only CEOs and Administrators can access this report.
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
          <p className="text-slate-600">Loading commission data...</p>
        </div>
      </div>
    );
  }

  const grandTotal = employeeTotals.reduce((sum, emp) => sum + emp.total_commission, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Commission Totals for Gusto
          </h1>
          <p className="text-slate-600">
            Consolidated commission totals for manual payroll entry
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="border-blue-300 bg-blue-50">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>For Gusto Manual Entry:</strong> This report shows only PAID commissions. 
            Use these totals when entering commission amounts manually in Gusto payroll.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Select Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="flex-1"
                >
                  Clear Dates
                </Button>
                <Button
                  onClick={exportCSV}
                  disabled={employeeTotals.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-600">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900">{employeeTotals.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Jobs</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employeeTotals.reduce((sum, emp) => sum + emp.job_count, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Grand Total Commission</p>
                <p className="text-2xl font-bold text-green-600">${grandTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Totals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Totals by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeTotals.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No paid commissions found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Employee Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900">Jobs</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Total Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeTotals.map((emp, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {emp.employee_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {emp.employee_email}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-900">
                          {emp.job_count}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          ${emp.total_commission.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                      <td className="py-3 px-4 text-slate-900">TOTAL</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-center text-slate-900">
                        {employeeTotals.reduce((sum, emp) => sum + emp.job_count, 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-700">
                        ${grandTotal.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-sm">How to use this report</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <ol className="list-decimal list-inside space-y-1">
              <li>Select the date range for the payroll period</li>
              <li>Verify the commission totals shown above</li>
              <li>Click "Export CSV" to download the report</li>
              <li>Manually enter these amounts in Gusto payroll under commission/bonus</li>
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              <strong>Note:</strong> Only commissions with status "PAID" are included in this report.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}