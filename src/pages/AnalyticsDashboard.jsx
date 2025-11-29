import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../components/shared/PageHeader";
import { BarChart3, Users, Briefcase, TrendingUp, Clock, DollarSign, Target, Award } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Bar, Line, Pie } from 'recharts';
import { BarChart, LineChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AnalyticsDashboard() {
  const { t, language } = useLanguage();

  // Fetch all data
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
    initialData: []
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // 9. JOB PERFORMANCE DASHBOARD
  const jobPerformance = useMemo(() => {
    return jobs.filter(j => j.status !== 'archived').map(job => {
      const jobExpenses = expenses.filter(e => e.job_id === job.id);
      const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
      const jobInvoices = invoices.filter(i => i.job_id === job.id);
      
      const totalExpenses = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalHours = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const laborCost = jobTimeEntries.reduce((sum, t) => {
        const emp = employees.find(e => e.email === t.employee_email);
        const rate = emp?.hourly_rate || 25;
        return sum + ((t.hours_worked || 0) * rate);
      }, 0);
      
      const totalCost = totalExpenses + laborCost;
      const revenue = jobInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;
      
      return {
        id: job.id,
        name: job.name,
        status: job.status,
        totalHours,
        totalCost,
        revenue,
        profit,
        profitMargin,
        efficiency: job.estimated_hours > 0 ? ((totalHours / job.estimated_hours) * 100) : 0
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [jobs, expenses, timeEntries, invoices, employees]);

  // 10. EMPLOYEE PRODUCTIVITY REPORT
  const employeeProductivity = useMemo(() => {
    const activeEmployees = employees.filter(e => e.employment_status === 'active');
    
    return activeEmployees.map(emp => {
      const empTimeEntries = timeEntries.filter(t => t.employee_email === emp.email);
      const empJobs = [...new Set(empTimeEntries.map(t => t.job_id))];
      
      const totalHours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const billableRevenue = empTimeEntries.reduce((sum, t) => {
        const job = jobs.find(j => j.id === t.job_id);
        if (!job) return sum;
        
        const jobInvoices = invoices.filter(i => i.job_id === job.id);
        const jobRevenue = jobInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
        const jobTotalHours = timeEntries.filter(te => te.job_id === job.id).reduce((s, te) => s + (te.hours_worked || 0), 0);
        
        const revenuePerHour = jobTotalHours > 0 ? (jobRevenue / jobTotalHours) : 0;
        return sum + ((t.hours_worked || 0) * revenuePerHour);
      }, 0);
      
      const laborCost = totalHours * (emp.hourly_rate || 25);
      const revenuePerHour = totalHours > 0 ? (billableRevenue / totalHours) : 0;
      const profitPerHour = revenuePerHour - (emp.hourly_rate || 25);
      
      return {
        email: emp.email,
        name: emp.full_name,
        totalHours,
        jobsCount: empJobs.length,
        billableRevenue,
        laborCost,
        revenuePerHour,
        profitPerHour,
        efficiency: laborCost > 0 ? ((billableRevenue / laborCost) * 100) : 0
      };
    }).sort((a, b) => b.billableRevenue - a.billableRevenue);
  }, [employees, timeEntries, jobs, invoices]);

  // 11. CUSTOMER PROFITABILITY ANALYSIS
  const customerProfitability = useMemo(() => {
    const customerMap = new Map();
    
    invoices.forEach(inv => {
      if (!inv.customer_id) return;
      
      if (!customerMap.has(inv.customer_id)) {
        customerMap.set(inv.customer_id, {
          id: inv.customer_id,
          name: inv.customer_name,
          totalRevenue: 0,
          totalCost: 0,
          jobsCount: 0,
          invoicesCount: 0
        });
      }
      
      const customer = customerMap.get(inv.customer_id);
      customer.totalRevenue += inv.total || 0;
      customer.invoicesCount += 1;
      
      if (inv.job_id) {
        const jobExpenses = expenses.filter(e => e.job_id === inv.job_id);
        const jobTimeEntries = timeEntries.filter(t => t.job_id === inv.job_id);
        
        const expensesCost = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const laborCost = jobTimeEntries.reduce((sum, t) => {
          const emp = employees.find(e => e.email === t.employee_email);
          return sum + ((t.hours_worked || 0) * (emp?.hourly_rate || 25));
        }, 0);
        
        customer.totalCost += expensesCost + laborCost;
      }
    });
    
    return Array.from(customerMap.values()).map(customer => ({
      ...customer,
      profit: customer.totalRevenue - customer.totalCost,
      profitMargin: customer.totalRevenue > 0 ? ((customer.totalRevenue - customer.totalCost) / customer.totalRevenue * 100) : 0
    })).sort((a, b) => b.profit - a.profit);
  }, [invoices, expenses, timeEntries, employees]);

  // 12. COST PER HOUR ANALYSIS
  const costPerHourAnalysis = useMemo(() => {
    return employees.filter(e => e.employment_status === 'active').map(emp => {
      const empTimeEntries = timeEntries.filter(t => t.employee_email === emp.email);
      const totalHours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      
      const empExpenses = expenses.filter(e => e.employee_email === emp.email);
      const totalExpenses = empExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const hourlyRate = emp.hourly_rate || 25;
      const laborCost = totalHours * hourlyRate;
      const totalCost = laborCost + totalExpenses;
      const costPerHour = totalHours > 0 ? (totalCost / totalHours) : hourlyRate;
      
      return {
        name: emp.full_name,
        hourlyRate,
        totalHours,
        laborCost,
        expenses: totalExpenses,
        totalCost,
        costPerHour
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }, [employees, timeEntries, expenses]);

  // 13. REVENUE BY SERVICE TYPE
  const revenueByService = useMemo(() => {
    const serviceMap = new Map();
    
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const service = item.description || 'Other';
        if (!serviceMap.has(service)) {
          serviceMap.set(service, { service, revenue: 0, count: 0 });
        }
        const s = serviceMap.get(service);
        s.revenue += item.total || 0;
        s.count += 1;
      });
    });
    
    return Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [invoices]);

  // 14. OVERTIME COST ANALYSIS
  const overtimeCostAnalysis = useMemo(() => {
    const overtimeEntries = timeEntries.filter(t => t.hour_type === 'overtime');
    const overtimeByEmployee = new Map();
    
    overtimeEntries.forEach(entry => {
      if (!overtimeByEmployee.has(entry.employee_email)) {
        const emp = employees.find(e => e.email === entry.employee_email);
        overtimeByEmployee.set(entry.employee_email, {
          name: entry.employee_name,
          hours: 0,
          cost: 0,
          rate: (emp?.hourly_rate || 25) * 1.5
        });
      }
      
      const data = overtimeByEmployee.get(entry.employee_email);
      data.hours += entry.hours_worked || 0;
      data.cost += (entry.hours_worked || 0) * data.rate;
    });
    
    return Array.from(overtimeByEmployee.values())
      .sort((a, b) => b.cost - a.cost);
  }, [timeEntries, employees]);

  // 15. JOB COMPLETION RATE
  const jobCompletionRate = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const activeJobs = jobs.filter(j => j.status === 'active');
    const totalJobs = completedJobs.length + activeJobs.length;
    
    const completionRate = totalJobs > 0 ? ((completedJobs.length / totalJobs) * 100) : 0;
    
    // On-time completion
    const onTimeCompletions = completedJobs.filter(job => {
      if (!job.completed_date) return false;
      const jobAssignments = []; // Would need JobAssignment data
      // Simplified: assume on-time if completed
      return true;
    });
    
    return {
      total: totalJobs,
      completed: completedJobs.length,
      active: activeJobs.length,
      completionRate,
      onTimeRate: completedJobs.length > 0 ? ((onTimeCompletions.length / completedJobs.length) * 100) : 0
    };
  }, [jobs]);

  // 16. QUOTE TO INVOICE CONVERSION RATE
  const quoteConversionRate = useMemo(() => {
    const convertedQuotes = quotes.filter(q => q.status === 'converted_to_invoice');
    const totalQuotes = quotes.filter(q => q.status !== 'draft');
    
    const conversionRate = totalQuotes.length > 0 ? ((convertedQuotes.length / totalQuotes.length) * 100) : 0;
    
    const totalQuoteValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const convertedValue = convertedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    
    return {
      totalQuotes: totalQuotes.length,
      convertedQuotes: convertedQuotes.length,
      conversionRate,
      totalQuoteValue,
      convertedValue,
      valueConversionRate: totalQuoteValue > 0 ? ((convertedValue / totalQuoteValue) * 100) : 0
    };
  }, [quotes]);

  const topJobsByProfit = jobPerformance.slice(0, 5);
  const topEmployeesByRevenue = employeeProductivity.slice(0, 5);
  const topCustomersByProfit = customerProfitability.slice(0, 5);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Dashboard de Analytics" : "Analytics Dashboard"}
          description={language === 'es' ? "Análisis detallado de rendimiento y productividad" : "Detailed performance and productivity analysis"}
          icon={BarChart3}
        />

        {/* KEY METRICS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Tasa de Conversión' : 'Conversion Rate'}
                </p>
                <Target className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{quoteConversionRate.conversionRate.toFixed(1)}%</p>
              <p className="text-white text-xs mt-1">
                {quoteConversionRate.convertedQuotes}/{quoteConversionRate.totalQuotes} {language === 'es' ? 'quotes' : 'quotes'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Tasa de Finalización' : 'Completion Rate'}
                </p>
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{jobCompletionRate.completionRate.toFixed(1)}%</p>
              <p className="text-white text-xs mt-1">
                {jobCompletionRate.completed}/{jobCompletionRate.total} {language === 'es' ? 'trabajos' : 'jobs'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Costo Overtime' : 'Overtime Cost'}
                </p>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">
                ${overtimeCostAnalysis.reduce((sum, e) => sum + e.cost, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-white text-xs mt-1">
                {overtimeCostAnalysis.reduce((sum, e) => sum + e.hours, 0).toFixed(0)} {language === 'es' ? 'horas' : 'hours'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Empleados Activos' : 'Active Employees'}
                </p>
                <Users className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{employeeProductivity.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* TOP JOBS BY PROFIT */}
        <Card className="mb-8 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {language === 'es' ? 'Top 5 Proyectos por Rentabilidad' : 'Top 5 Jobs by Profitability'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topJobsByProfit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#22c55e" name={language === 'es' ? 'Ingresos' : 'Revenue'} />
                <Bar dataKey="totalCost" fill="#ef4444" name={language === 'es' ? 'Costos' : 'Cost'} />
                <Bar dataKey="profit" fill="#3b82f6" name={language === 'es' ? 'Ganancia' : 'Profit'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* EMPLOYEE PRODUCTIVITY */}
        <Card className="mb-8 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              {language === 'es' ? 'Top 5 Empleados por Revenue Generado' : 'Top 5 Employees by Revenue Generated'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEmployeesByRevenue.map((emp, idx) => (
                <div key={emp.email} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">#{idx + 1}</span>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{emp.name}</h4>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                        <span>{emp.totalHours.toFixed(1)} {language === 'es' ? 'horas' : 'hours'}</span>
                        <span>•</span>
                        <span>{emp.jobsCount} {language === 'es' ? 'trabajos' : 'jobs'}</span>
                        <span>•</span>
                        <span>${emp.revenuePerHour.toFixed(2)}/hr</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600 dark:text-green-400">
                        ${emp.billableRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {language === 'es' ? 'Eficiencia' : 'Efficiency'}: {emp.efficiency.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${Math.min((emp.efficiency / 200) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CUSTOMER PROFITABILITY */}
        <Card className="mb-8 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {language === 'es' ? 'Top 5 Clientes por Rentabilidad' : 'Top 5 Customers by Profitability'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomersByProfit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#22c55e" name={language === 'es' ? 'Revenue' : 'Revenue'} />
                <Bar dataKey="totalCost" fill="#ef4444" name={language === 'es' ? 'Costo' : 'Cost'} />
                <Bar dataKey="profit" fill="#8b5cf6" name={language === 'es' ? 'Ganancia' : 'Profit'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REVENUE BY SERVICE TYPE */}
        <Card className="mb-8 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Revenue por Tipo de Servicio' : 'Revenue by Service Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={revenueByService}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.service}: $${entry.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* COST PER HOUR ANALYSIS */}
        <Card className="mb-8 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Costo Real por Hora (Top 10 Empleados)' : 'True Cost per Hour (Top 10 Employees)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costPerHourAnalysis.slice(0, 10).map(emp => (
                <div key={emp.name} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {language === 'es' ? 'Tarifa base' : 'Base rate'}: ${emp.hourlyRate.toFixed(2)}/hr | 
                      {emp.totalHours.toFixed(0)} hrs | 
                      ${emp.expenses.toFixed(0)} {language === 'es' ? 'gastos' : 'expenses'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-900 dark:text-white">
                      ${emp.costPerHour.toFixed(2)}/hr
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {language === 'es' ? 'Costo total' : 'Total cost'}: ${emp.totalCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* OVERTIME COST BREAKDOWN */}
        {overtimeCostAnalysis.length > 0 && (
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                {language === 'es' ? 'Análisis de Costos de Overtime' : 'Overtime Cost Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overtimeCostAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#f59e0b" name={language === 'es' ? 'Horas OT' : 'OT Hours'} />
                  <Bar dataKey="cost" fill="#ef4444" name={language === 'es' ? 'Costo OT' : 'OT Cost'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}