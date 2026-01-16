import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Clock, Users, Briefcase, Target, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function JobCostDashboard() {
  const { t } = useLanguage();
  const [selectedJobId, setSelectedJobId] = useState('all');

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 100),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 500);
      }
      return base44.entities.TimeEntry.filter({ job_id: selectedJobId, status: 'approved' }, '-date', 500);
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.Expense.filter({ status: 'approved' }, '-date', 500);
      }
      return base44.entities.Expense.filter({ job_id: selectedJobId, status: 'approved' }, '-date', 500);
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.Invoice.list('-invoice_date', 500);
      }
      return base44.entities.Invoice.filter({ job_id: selectedJobId }, '-invoice_date', 500);
    },
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.ChangeOrder.filter({ status: 'approved' }, '-created_date', 200);
      }
      return base44.entities.ChangeOrder.filter({ job_id: selectedJobId, status: 'approved' }, '-created_date', 200);
    },
  });

  // Calculate metrics
  const selectedJob = selectedJobId === 'all' ? null : jobs.find(j => j.id === selectedJobId);
  
  const laborCost = timeEntries.reduce((sum, entry) => {
    const hours = entry.hours_worked || 0;
    const rate = 35; // Average hourly cost
    return sum + (hours * rate);
  }, 0);

  const expensesCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  const totalCost = laborCost + expensesCost;
  
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid' || inv.status === 'partial')
    .reduce((sum, inv) => sum + ((inv.amount_paid || 0)), 0);

  const changeOrderRevenue = changeOrders.reduce((sum, co) => sum + (co.change_amount || 0), 0);
  
  const totalRevenueWithCO = totalRevenue + changeOrderRevenue;
  
  const contractAmount = selectedJob?.contract_amount || 
    jobs.reduce((sum, j) => sum + (j.contract_amount || 0), 0);

  const profit = totalRevenueWithCO - totalCost;
  const profitMargin = totalRevenueWithCO > 0 ? ((profit / totalRevenueWithCO) * 100) : 0;
  
  const budgetVariance = contractAmount > 0 ? (((totalCost - contractAmount) / contractAmount) * 100) : 0;

  // Cost breakdown
  const costBreakdown = [
    { name: 'Labor', value: laborCost, color: '#3B82F6' },
    { name: 'Materials/Expenses', value: expensesCost, color: '#10B981' },
  ];

  // Monthly trend
  const monthlyData = React.useMemo(() => {
    const months = {};
    
    timeEntries.forEach(entry => {
      const month = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!months[month]) months[month] = { month, labor: 0, expenses: 0, revenue: 0 };
      months[month].labor += (entry.hours_worked || 0) * 35;
    });

    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!months[month]) months[month] = { month, labor: 0, expenses: 0, revenue: 0 };
      months[month].expenses += exp.amount || 0;
    });

    invoices.forEach(inv => {
      if (inv.status === 'paid' || inv.status === 'partial') {
        const month = new Date(inv.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!months[month]) months[month] = { month, labor: 0, expenses: 0, revenue: 0 };
        months[month].revenue += inv.amount_paid || 0;
      }
    });

    return Object.values(months).sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [timeEntries, expenses, invoices]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title="Job Cost Dashboard"
        description="Real-time cost tracking and profitability analysis"
        icon={Activity}
      />

      {/* Job Selector */}
      <Card className="mb-6 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Briefcase className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select Job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs Combined</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name} - {job.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${totalCost.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">Labor + Expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${totalRevenueWithCO.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">Invoiced + Change Orders</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {profit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(profit).toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {profitMargin.toFixed(1)}% Margin
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Budget Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {budgetVariance <= 0 ? (
                <Target className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <p className={`text-2xl font-bold ${budgetVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {budgetVariance >= 0 ? '+' : ''}{budgetVariance.toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {budgetVariance <= 0 ? 'Under Budget' : 'Over Budget'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Breakdown */}
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="labor" stroke="#3B82F6" name="Labor" />
                <Line type="monotone" dataKey="expenses" stroke="#10B981" name="Expenses" />
                <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle>Labor Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Hours</span>
                <span className="font-semibold">{timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0).toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Average Rate</span>
                <span className="font-semibold">$35/hr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Labor Cost</span>
                <span className="font-bold text-lg">${laborCost.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle>Expenses & Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</span>
                <span className="font-semibold">{expenses.length} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Change Orders</span>
                <span className="font-semibold text-green-600">+${changeOrderRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Material Cost</span>
                <span className="font-bold text-lg">${expensesCost.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}