import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Clock, Users as UsersIcon, Briefcase, Target, Award, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangeFilter from "../components/reportes/DateRangeFilter";
import EmployeeProductivityReport from "../components/reportes/EmployeeProductivityReport";
import ClientProfitabilityReport from "../components/reportes/ClientProfitabilityReport";
import ResourceAllocationReport from "../components/reportes/ResourceAllocationReport";
import WorkloadHeatmap from "../components/reportes/WorkloadHeatmap";
import TeamWorkloadChart from "../components/reportes/TeamWorkloadChart";
import InvoiceAgingReport from "../components/reportes/InvoiceAgingReport";

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export default function Reportes() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    preset: 'this_month'
  });
  const [activeTab, setActiveTab] = useState('overview');

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
    initialData: []
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-quote_date'),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000),
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('first_name'),
    initialData: []
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list('-date'),
    initialData: []
  });

  // Filter data by date range
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    return invDate >= dateRange.start && invDate <= dateRange.end;
  });

  const filteredQuotes = quotes.filter(q => {
    const quoteDate = new Date(q.quote_date);
    return quoteDate >= dateRange.start && quoteDate <= dateRange.end;
  });

  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return exp.status === 'approved' && expDate >= dateRange.start && expDate <= dateRange.end;
  });

  const filteredTimeEntries = timeEntries.filter(e => {
    const entryDate = new Date(e.date);
    return e.status === 'approved' && entryDate >= dateRange.start && entryDate <= dateRange.end;
  });

  // Financial calculations
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const totalHours = filteredTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;

  // Quote conversion metrics
  const quotesValue = filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const convertedQuotes = filteredQuotes.filter(q => q.status === 'converted_to_invoice' || q.invoice_id);
  const conversionRate = filteredQuotes.length > 0 ? (convertedQuotes.length / filteredQuotes.length) * 100 : 0;

  // Monthly revenue trend
  const getMonthlyRevenue = () => {
    const months = {};
    filteredInvoices.forEach(inv => {
      const month = format(new Date(inv.invoice_date), 'MMM yy');
      months[month] = (months[month] || 0) + (inv.total || 0);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  };

  // Expenses by category
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    const category = exp.category || 'other';
    acc[category] = (acc[category] || 0) + exp.amount;
    return acc;
  }, {});

  const expensesChartData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value 
    }))
    .sort((a, b) => b.value - a.value);

  // Team performance
  const teamPerformance = teams.map(team => {
    const teamJobs = jobs.filter(j => j.team_id === team.id);
    const teamInvoices = filteredInvoices.filter(inv => inv.team_id === team.id);
    const revenue = teamInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const teamTimeEntries = filteredTimeEntries.filter(e => {
      const emp = employees.find(emp => emp.email === e.employee_email);
      return emp?.team_id === team.id;
    });
    const hours = teamTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    
    return {
      name: team.team_name,
      revenue,
      hours,
      activeJobs: teamJobs.filter(j => j.status === 'active').length
    };
  }).filter(t => t.revenue > 0 || t.hours > 0);

  // Top employees by revenue generated
  const employeeRevenue = employees
    .filter(e => e.employment_status === 'active')
    .map(emp => {
      const empTimeEntries = filteredTimeEntries.filter(e => e.employee_email === emp.email);
      const hours = empTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      
      // Calculate revenue contribution based on hours worked on jobs
      const jobsWorked = [...new Set(empTimeEntries.map(e => e.job_id).filter(Boolean))];
      const revenue = jobsWorked.reduce((sum, jobId) => {
        const jobInvoices = filteredInvoices.filter(inv => inv.job_id === jobId);
        const jobRevenue = jobInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
        const jobTimeEntries = filteredTimeEntries.filter(e => e.job_id === jobId);
        const totalJobHours = jobTimeEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
        const empJobHours = empTimeEntries.filter(e => e.job_id === jobId).reduce((s, e) => s + (e.hours_worked || 0), 0);
        const contribution = totalJobHours > 0 ? (empJobHours / totalJobHours) * jobRevenue : 0;
        return sum + contribution;
      }, 0);
      
      return {
        name: emp.full_name || emp.email,
        hours,
        revenue
      };
    })
    .filter(e => e.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Project profitability — use Job SSOT fields (real_cost, revenue_real, profit_real)
  const projectProfitability = jobs.map(job => {
    // Use SSOT aggregated fields if available, fallback to invoice calculation
    const revenue = job.revenue_real > 0 ? job.revenue_real : filteredInvoices.filter(inv => inv.job_id === job.id).reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCost = job.real_cost > 0 ? job.real_cost : 0;
    const profit = job.profit_real !== undefined && job.profit_real !== 0 ? job.profit_real : (revenue - totalCost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const hours = filteredTimeEntries.filter(e => e.job_id === job.id).reduce((sum, e) => sum + (e.hours_worked || 0), 0);

    return {
      name: job.name,
      revenue,
      cost: totalCost,
      profit,
      margin,
      hours
    };
  })
  .filter(j => j.revenue > 0 || j.cost > 0)
  .sort((a, b) => b.profit - a.profit)
  .slice(0, 15);

  // Workload distribution by day of week
  const workloadByDay = {
    Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
  };
  
  filteredTimeEntries.forEach(entry => {
    const day = format(new Date(entry.date), 'EEE');
    workloadByDay[day] = (workloadByDay[day] || 0) + (entry.hours_worked || 0);
  });

  const workloadChartData = Object.entries(workloadByDay).map(([day, hours]) => ({ day, hours }));

  // Revenue vs Cost trend
  const getRevenueVsCostTrend = () => {
    const months = {};
    
    filteredInvoices.forEach(inv => {
      const month = format(new Date(inv.invoice_date), 'MMM yy');
      if (!months[month]) months[month] = { month, revenue: 0, cost: 0 };
      months[month].revenue += inv.total || 0;
    });
    
    filteredExpenses.forEach(exp => {
      const month = format(new Date(exp.date), 'MMM yy');
      if (!months[month]) months[month] = { month, revenue: 0, cost: 0 };
      months[month].cost += exp.amount || 0;
    });
    
    return Object.values(months).map(m => ({
      ...m,
      profit: m.revenue - m.cost
    }));
  };

  const exportReport = () => {
    const headers = [
      'Metric',
      'Value'
    ];

    const metrics = [
      ['Period', `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`],
      ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
      ['Total Expenses', `$${totalExpenses.toFixed(2)}`],
      ['Net Profit', `$${netProfit.toFixed(2)}`],
      ['Profit Margin', `${profitMargin.toFixed(1)}%`],
      ['Total Hours', `${totalHours.toFixed(1)}h`],
      ['Avg Hourly Rate', `$${avgHourlyRate.toFixed(2)}/h`],
      ['Active Employees', employees.filter(e => e.employment_status === 'active').length],
      ['Active Jobs', jobs.filter(j => j.status === 'active').length],
      ['Quotes Sent', filteredQuotes.length],
      ['Quote Conversion Rate', `${conversionRate.toFixed(1)}%`]
    ];

    const csvContent = [
      headers.join(','),
      ...metrics.map(row => row.join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Analytics & Reports' : 'Analytics & Reports'}
          description={language === 'es' ? 'Métricas de negocio y análisis de rendimiento' : 'Business metrics and performance analytics'}
          icon={BarChart3}
          actions={
            <div className="flex gap-3">
              <DateRangeFilter 
                onDateRangeChange={setDateRange}
                defaultRange="this_month"
              />
              <Button onClick={exportReport} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Exportar' : 'Export'}
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white dark:text-slate-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {language === 'es' ? 'General' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Financiero' : 'Financial'}
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Proyectos' : 'Projects'}
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Equipo' : 'Team'}
            </TabsTrigger>
            <TabsTrigger 
              value="workload" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Carga de Trabajo' : 'Workload'}
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Clientes' : 'Clients'}
            </TabsTrigger>
            <TabsTrigger 
              value="aging" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Aging' : 'Aging'}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-50">
                        {language === 'es' ? 'Ingresos Totales' : 'Total Revenue'}
                      </p>
                      <p className="text-3xl font-bold text-white mt-1">
                        ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-orange-600 shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-50">
                        {language === 'es' ? 'Gastos Totales' : 'Total Expenses'}
                      </p>
                      <p className="text-3xl font-bold text-white mt-1">
                        ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-[#3B9FF3] to-blue-600' : 'from-red-600 to-red-700'} shadow-lg border-0`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">
                        {language === 'es' ? 'Ganancia Neta' : 'Net Profit'}
                      </p>
                      <p className="text-3xl font-bold text-white mt-1">
                        ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-white/80 mt-1">
                        {profitMargin.toFixed(1)}% {language === 'es' ? 'margen' : 'margin'}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-50">
                        {language === 'es' ? 'Horas Trabajadas' : 'Hours Worked'}
                      </p>
                      <p className="text-3xl font-bold text-white mt-1">{totalHours.toFixed(0)}h</p>
                      <p className="text-xs text-white/80 mt-1">
                        ${avgHourlyRate.toFixed(0)}/h {language === 'es' ? 'promedio' : 'avg'}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                  {language === 'es' ? 'Tendencia de Ingresos' : 'Revenue Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={getMonthlyRevenue()}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B9FF3" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B9FF3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                    <XAxis dataKey="month" stroke="rgba(100,116,139,0.8)" />
                    <YAxis stroke="rgba(100,116,139,0.8)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        borderRadius: '8px',
                        color: '#0f172a'
                      }}
                      formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3B9FF3" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quote Performance */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    {language === 'es' ? 'Rendimiento de Estimados' : 'Quote Performance'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Estimados Enviados' : 'Quotes Sent'}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{filteredQuotes.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Convertidos' : 'Converted'}</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{convertedQuotes.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t dark:border-slate-700 pt-4">
                    <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Tasa de Conversión' : 'Conversion Rate'}</span>
                    <span className="text-3xl font-bold text-[#3B9FF3] dark:text-blue-400">{conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Valor Total' : 'Total Value'}</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">${quotesValue.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    {language === 'es' ? 'Mejores Empleados' : 'Top Performers'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {employeeRevenue.slice(0, 5).map((emp, idx) => (
                      <div key={emp.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#3B9FF3] to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{emp.hours.toFixed(0)}h</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#3B9FF3] dark:text-blue-400">
                          ${emp.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FINANCIAL TAB */}
          <TabsContent value="financial" className="space-y-6">
            {/* Revenue vs Cost Trend */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white">
                  {language === 'es' ? 'Ingresos vs Costos (Tendencia)' : 'Revenue vs Cost (Trend)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={getRevenueVsCostTrend()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                    <XAxis dataKey="month" stroke="rgba(100,116,139,0.8)" />
                    <YAxis stroke="rgba(100,116,139,0.8)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        borderRadius: '8px',
                        color: '#0f172a'
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name={language === 'es' ? 'Ingresos' : 'Revenue'} />
                    <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} name={language === 'es' ? 'Costos' : 'Cost'} />
                    <Line type="monotone" dataKey="profit" stroke="#3B9FF3" strokeWidth={3} name={language === 'es' ? 'Ganancia' : 'Profit'} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses Breakdown */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white">
                  {language === 'es' ? 'Gastos por Categoría' : 'Expenses by Category'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={expensesChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        borderRadius: '8px',
                        color: '#0f172a'
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="space-y-6">
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                  {language === 'es' ? 'Rentabilidad de Proyectos' : 'Project Profitability'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={projectProfitability} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(100,116,139,0.8)" 
                      angle={-45} 
                      textAnchor="end" 
                      height={120}
                      interval={0}
                    />
                    <YAxis stroke="rgba(100,116,139,0.8)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        borderRadius: '8px',
                        color: '#0f172a'
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name={language === 'es' ? 'Ingresos' : 'Revenue'} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cost" fill="#ef4444" name={language === 'es' ? 'Costos' : 'Cost'} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="profit" fill="#3B9FF3" name={language === 'es' ? 'Ganancia' : 'Profit'} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Project Details Table */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white">
                  {language === 'es' ? 'Detalles de Proyectos' : 'Project Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="text-left p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Proyecto' : 'Project'}</th>
                        <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Ingresos' : 'Revenue'}</th>
                        <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Costos' : 'Cost'}</th>
                        <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Ganancia' : 'Profit'}</th>
                        <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Margen' : 'Margin'}</th>
                        <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Horas' : 'Hours'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProfitability.map((project, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-4 font-medium text-slate-900 dark:text-white">{project.name}</td>
                          <td className="p-4 text-right text-green-600 dark:text-green-400 font-semibold">
                            ${project.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-4 text-right text-red-600 dark:text-red-400 font-semibold">
                            ${project.cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className={`p-4 text-right font-bold ${project.profit >= 0 ? 'text-[#3B9FF3] dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${project.profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className={`p-4 text-right font-semibold ${project.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {project.margin.toFixed(1)}%
                          </td>
                          <td className="p-4 text-right text-slate-700 dark:text-slate-300">{project.hours.toFixed(0)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team" className="space-y-6">
            <EmployeeProductivityReport
              employees={employees}
              timeEntries={filteredTimeEntries}
              jobs={jobs}
              dateRange={dateRange}
            />

            {/* Team Performance */}
            {teamPerformance.length > 0 && (
              <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                    {language === 'es' ? 'Rendimiento por Equipo' : 'Team Performance'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={teamPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                      <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" />
                      <YAxis stroke="rgba(100,116,139,0.8)" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(226, 232, 240, 1)',
                          borderRadius: '8px',
                          color: '#0f172a'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3B9FF3" name={language === 'es' ? 'Ingresos' : 'Revenue'} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="hours" fill="#10b981" name={language === 'es' ? 'Horas' : 'Hours'} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* WORKLOAD TAB - ENHANCED */}
          <TabsContent value="workload" className="space-y-6">
            {/* Workload Heatmap */}
            <WorkloadHeatmap
              assignments={assignments}
              timeEntries={filteredTimeEntries}
              dateRange={dateRange}
              language={language}
            />

            {/* Hours by Day */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                  {language === 'es' ? 'Distribución de Horas por Día' : 'Hours Distribution by Day'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={workloadChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                    <XAxis dataKey="day" stroke="rgba(100,116,139,0.8)" />
                    <YAxis stroke="rgba(100,116,139,0.8)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        borderRadius: '8px',
                        color: '#0f172a'
                      }}
                      formatter={(value) => `${value.toFixed(1)}h`}
                    />
                    <Bar dataKey="hours" fill="#3B9FF3" name={language === 'es' ? 'Horas' : 'Hours'} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Workload */}
            <TeamWorkloadChart
              teams={teams}
              employees={employees}
              timeEntries={filteredTimeEntries}
              assignments={assignments}
              language={language}
            />

            <ResourceAllocationReport
              teams={teams}
              employees={employees}
              jobs={jobs}
              assignments={assignments}
              timeEntries={filteredTimeEntries}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* CLIENTS TAB */}
          <TabsContent value="clients">
            <ClientProfitabilityReport
              customers={customers}
              jobs={jobs}
              invoices={filteredInvoices}
              expenses={filteredExpenses}
              timeEntries={filteredTimeEntries}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* AGING TAB */}
          <TabsContent value="aging">
            <InvoiceAgingReport invoices={invoices} language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}