import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Calendar,
  Target,
  AlertCircle,
  Award,
  Clock,
  PieChart as PieChartIcon,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { startOfMonth, endOfMonth, startOfYear, format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function AdminDashboard() {
  const { language } = useLanguage();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    staleTime: Infinity,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: !!user && user.role === 'admin',
    staleTime: 300000,
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['allExpenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    enabled: !!user && user.role === 'admin',
    staleTime: 180000,
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }, 'name', 100),
    enabled: !!user,
    staleTime: 300000,
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name', 200),
    enabled: !!user && user.role === 'admin',
    staleTime: 600000,
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('company', 100),
    enabled: !!user && user.role === 'admin',
    staleTime: 600000,
    initialData: [],
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 200),
    enabled: !!user && user.role === 'admin',
    staleTime: 180000,
    initialData: [],
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const yearStart = startOfYear(today);

  // Financial Metrics
  const financialMetrics = useMemo(() => {
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= monthStart && invDate <= monthEnd;
    });

    const monthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return exp.status === 'approved' && expDate >= monthStart && expDate <= monthEnd;
    });

    const totalRevenue = monthInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    const pendingInvoices = monthInvoices.filter(inv => inv.status === 'sent' || inv.status === 'partial').length;
    const pendingAmount = monthInvoices
      .filter(inv => inv.status === 'sent' || inv.status === 'partial')
      .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.amount_paid || 0)), 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      pendingInvoices,
      pendingAmount,
    };
  }, [invoices, expenses, monthStart, monthEnd]);

  // Active Employees
  const activeEmployees = employees.filter(e =>
    e.employment_status === 'active' ||
    e.employment_status === 'pending_registration' ||
    !e.employment_status
  );

  // Top Customers by Revenue
  const topCustomers = useMemo(() => {
    const customerRevenue = {};
    
    invoices
      .filter(inv => inv.status === 'paid')
      .forEach(inv => {
        const customerId = inv.customer_id || inv.customer_name;
        if (!customerRevenue[customerId]) {
          customerRevenue[customerId] = {
            name: inv.customer_name,
            revenue: 0,
            jobs: 0,
          };
        }
        customerRevenue[customerId].revenue += inv.total || 0;
        customerRevenue[customerId].jobs += 1;
      });

    return Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices]);

  // Jobs Performance
  const jobsMetrics = useMemo(() => {
    const activeJobsCount = jobs.length;
    const jobsWithBudget = jobs.filter(j => j.contract_amount && j.contract_amount > 0);
    
    const totalContractValue = jobsWithBudget.reduce((sum, j) => sum + (j.contract_amount || 0), 0);
    const avgContractValue = jobsWithBudget.length > 0 ? totalContractValue / jobsWithBudget.length : 0;

    return {
      activeJobsCount,
      totalContractValue,
      avgContractValue,
    };
  }, [jobs]);

  // Monthly Trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthRevenue = invoices
        .filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return inv.status === 'paid' && invDate >= start && invDate <= end;
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return exp.status === 'approved' && expDate >= start && expDate <= end;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      months.push({
        month: format(date, 'MMM'),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }
    return months;
  }, [invoices, expenses]);

  // Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    const categories = {};
    
    expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return exp.status === 'approved' && expDate >= monthStart && expDate <= monthEnd;
      })
      .forEach(exp => {
        const cat = exp.category || 'other';
        categories[cat] = (categories[cat] || 0) + exp.amount;
      });

    return Object.entries(categories)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, monthStart, monthEnd]);

  // Team Productivity
  const teamProductivity = useMemo(() => {
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });

    const totalHours = monthEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const avgHoursPerEmployee = activeEmployees.length > 0 ? totalHours / activeEmployees.length : 0;

    return {
      totalHours: totalHours.toFixed(1),
      avgHoursPerEmployee: avgHoursPerEmployee.toFixed(1),
    };
  }, [timeEntries, monthStart, monthEnd, activeEmployees]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">
            {language === 'es' ? 'Cargando panel ejecutivo...' : 'Loading executive dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8">
        <Card className="max-w-md bg-white shadow-2xl border-red-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {language === 'es' ? 'Acceso Restringido' : 'Access Restricted'}
            </h2>
            <p className="text-slate-600 mb-6">
              {language === 'es' 
                ? 'Este dashboard es solo para administradores.' 
                : 'This dashboard is for administrators only.'}
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-[#3B9FF3] hover:bg-blue-600 text-white">
                {language === 'es' ? 'Ir al Dashboard Principal' : 'Go to Main Dashboard'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                {language === 'es' ? 'Panel de Gestión' : 'Management Dashboard'}
              </h1>
              <p className="text-slate-600 text-lg">
                {language === 'es' ? 'Vista ejecutiva de finanzas y operaciones' : 'Executive view of finances and operations'}
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-sm px-4 py-2">
              {format(today, 'MMMM yyyy')}
            </Badge>
          </div>
        </div>

        {/* Financial KPIs */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                  {language === 'es' ? 'Este Mes' : 'This Month'}
                </Badge>
              </div>
              <p className="text-3xl font-bold text-emerald-900 mb-1">
                ${financialMetrics.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-emerald-700">
                {language === 'es' ? 'Ingresos Totales' : 'Total Revenue'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  {language === 'es' ? 'Este Mes' : 'This Month'}
                </Badge>
              </div>
              <p className="text-3xl font-bold text-red-900 mb-1">
                ${financialMetrics.totalExpenses.toLocaleString()}
              </p>
              <p className="text-sm text-red-700">
                {language === 'es' ? 'Gastos Totales' : 'Total Expenses'}
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${financialMetrics.netProfit >= 0 ? 'from-cyan-50 to-blue-50 border-cyan-200' : 'from-orange-50 to-red-50 border-orange-200'} shadow-xl hover:shadow-2xl transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className={`w-8 h-8 ${financialMetrics.netProfit >= 0 ? 'text-cyan-600' : 'text-orange-600'}`} />
                <Badge className={`${financialMetrics.netProfit >= 0 ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
                  {financialMetrics.profitMargin.toFixed(1)}%
                </Badge>
              </div>
              <p className={`text-3xl font-bold ${financialMetrics.netProfit >= 0 ? 'text-cyan-900' : 'text-orange-900'} mb-1`}>
                ${Math.abs(financialMetrics.netProfit).toLocaleString()}
              </p>
              <p className={`text-sm ${financialMetrics.netProfit >= 0 ? 'text-cyan-700' : 'text-orange-700'}`}>
                {language === 'es' ? 'Ganancia Neta' : 'Net Profit'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-amber-600" />
                <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                  {financialMetrics.pendingInvoices}
                </Badge>
              </div>
              <p className="text-3xl font-bold text-amber-900 mb-1">
                ${financialMetrics.pendingAmount.toLocaleString()}
              </p>
              <p className="text-sm text-amber-700">
                {language === 'es' ? 'Por Cobrar' : 'Pending Collection'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Target className="w-5 h-5 text-purple-600" />
                {language === 'es' ? 'Tendencia Mensual (6 meses)' : 'Monthly Trend (6 months)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={language === 'es' ? 'Ingresos' : 'Revenue'} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name={language === 'es' ? 'Gastos' : 'Expenses'} />
                  <Line type="monotone" dataKey="profit" stroke="#3B9FF3" strokeWidth={2} name={language === 'es' ? 'Ganancia' : 'Profit'} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                {language === 'es' ? 'Desglose de Gastos' : 'Expense Breakdown'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Business Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to={createPageUrl('Empleados')}>
            <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-[#3B9FF3]" />
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-4xl font-bold text-slate-900 mb-2">{activeEmployees.length}</p>
                <p className="text-sm text-slate-600 mb-3">
                  {language === 'es' ? 'Empleados Activos' : 'Active Employees'}
                </p>
                <div className="text-xs text-slate-500">
                  {teamProductivity.avgHoursPerEmployee} {language === 'es' ? 'hrs promedio/mes' : 'avg hrs/month'}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Trabajos')}>
            <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Briefcase className="w-10 h-10 text-green-600" />
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-4xl font-bold text-slate-900 mb-2">{jobsMetrics.activeJobsCount}</p>
                <p className="text-sm text-slate-600 mb-3">
                  {language === 'es' ? 'Proyectos Activos' : 'Active Projects'}
                </p>
                <div className="text-xs text-slate-500">
                  ${jobsMetrics.avgContractValue.toLocaleString()} {language === 'es' ? 'valor promedio' : 'avg value'}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Clientes')}>
            <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Award className="w-10 h-10 text-purple-600" />
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-4xl font-bold text-slate-900 mb-2">{customers.length}</p>
                <p className="text-sm text-slate-600 mb-3">
                  {language === 'es' ? 'Clientes Totales' : 'Total Customers'}
                </p>
                <div className="text-xs text-slate-500">
                  {topCustomers.length} {language === 'es' ? 'clientes principales' : 'top customers'}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Top Customers */}
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Award className="w-5 h-5 text-purple-600" />
              {language === 'es' ? 'Top 5 Clientes por Ingresos' : 'Top 5 Customers by Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {topCustomers.length > 0 ? (
              <div className="space-y-4">
                {topCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        idx === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                        idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-yellow-600' :
                        'bg-gradient-to-br from-[#3B9FF3] to-blue-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-600">
                          {customer.jobs} {language === 'es' ? 'proyectos' : 'projects'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        ${customer.revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">{language === 'es' ? 'ingresos' : 'revenue'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {language === 'es' ? 'No hay datos de clientes aún' : 'No customer data yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}