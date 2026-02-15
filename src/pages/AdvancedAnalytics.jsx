import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { BarChart3, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfitabilityPredictor from '@/components/analytics/ProfitabilityPredictor';
import CustomerLifetimeValue from '@/components/analytics/CustomerLifetimeValue';
import RevenueForecaster from '@/components/analytics/RevenueForecaster';
import CostAnalysisBreakdown from '@/components/analytics/CostAnalysisBreakdown';
import { exportToExcel } from '@/components/shared/UniversalExcelExport';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function AdvancedAnalytics() {
  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['analytics-jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['analytics-invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['analytics-customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['analytics-expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 500),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['analytics-time'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 500),
  });

  // Key metrics
  const metrics = useMemo(() => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const totalCosts = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const laborCosts = timeEntries.reduce((sum, entry) => {
      const hours = entry.hours_worked || 0;
      const rate = entry.hour_type === 'overtime' ? 90 : 60;
      return sum + (hours * rate);
    }, 0);

    const totalProfit = totalRevenue - totalCosts - laborCosts;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCosts: totalCosts + laborCosts,
      totalProfit,
      profitMargin
    };
  }, [invoices, expenses, timeEntries]);

  const exportAnalytics = () => {
    const data = jobs.map(job => ({
      Job: job.name,
      Customer: job.customer_name,
      'Contract Amount': job.contract_amount || 0,
      'Estimated Cost': job.estimated_cost || 0,
      'Profit Margin': job.profit_margin || 0,
      Status: job.status
    }));
    exportToExcel(data, 'advanced_analytics', 'Analytics');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader
          title="Advanced Analytics"
          description="AI-powered insights, predictions, and profitability analysis"
          icon={BarChart3}
          actions={
            <Button
              onClick={exportAnalytics}
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Analytics
            </Button>
          }
        />

        {/* Key Metrics Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">${metrics.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-6">
              <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">Total Costs</p>
              <p className="text-3xl font-bold text-orange-600">${metrics.totalCosts.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Net Profit</p>
              <p className="text-3xl font-bold text-blue-600">${metrics.totalProfit.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6">
              <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Profit Margin</p>
              <p className="text-3xl font-bold text-purple-600">{metrics.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* AI-Powered Components */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ProfitabilityPredictor jobs={jobs} invoices={invoices} />
          <RevenueForecaster invoices={invoices} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <CustomerLifetimeValue customers={customers} invoices={invoices} />
          <CostAnalysisBreakdown expenses={expenses} timeEntries={timeEntries} />
        </div>
      </div>
    </div>
  );
}