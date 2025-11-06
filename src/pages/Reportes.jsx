import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Clock, Users as UsersIcon, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangeFilter from "../components/reportes/DateRangeFilter";
import EmployeeProductivityReport from "../components/reportes/EmployeeProductivityReport";
import ClientProfitabilityReport from "../components/reportes/ClientProfitabilityReport";
import ResourceAllocationReport from "../components/reportes/ResourceAllocationReport";

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Reportes() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    preset: 'this_month'
  });
  const [activeTab, setActiveTab] = useState('financial');

  // Load all necessary data
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
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

  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return exp.status === 'approved' && expDate >= dateRange.start && expDate <= dateRange.end;
  });

  const filteredTimeEntries = timeEntries.filter(e => {
    const entryDate = new Date(e.date);
    return e.status === 'approved' && entryDate >= dateRange.start && entryDate <= dateRange.end;
  });

  // Financial calculations
  const totalIncome = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalHours = filteredTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  // Monthly data for chart
  const getMonthlyData = () => {
    let current = new Date(dateRange.start);
    const months = [];
    
    while (current <= dateRange.end) {
      const monthKey = format(current, 'MMM yy');
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= monthStart && invDate <= monthEnd;
      });
      
      const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return exp.status === 'approved' && expDate >= monthStart && expDate <= monthEnd;
      });
      
      months.push({
        month: monthKey,
        income: monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        expenses: monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
      });
      
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    
    return months;
  };

  // Expenses by category
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const expensesChartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  // Hours by employee
  const hoursByEmployee = employees
    .filter(e => e.employment_status === 'active')
    .map(emp => {
      const empEntries = filteredTimeEntries.filter(e => e.employee_email === emp.email);
      const hours = empEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      return {
        name: emp.full_name || emp.email,
        hours
      };
    })
    .filter(e => e.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Jobs profitability
  const jobsProfitability = jobs.map(job => {
    const jobInvoices = filteredInvoices.filter(inv => inv.job_id === job.id);
    const revenue = jobInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const jobTimeEntries = filteredTimeEntries.filter(e => e.job_id === job.id);
    const jobHours = jobTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const laborCost = jobHours * 25;
    
    const jobExpenses = filteredExpenses.filter(e => e.job_id === job.id);
    const expenseCost = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const cost = laborCost + expenseCost;
    const profit = revenue - cost;
    
    return {
      name: job.name,
      revenue,
      cost,
      profit
    };
  }).filter(j => j.revenue > 0 || j.cost > 0).slice(0, 10);

  const exportReport = () => {
    const reportData = {
      period: `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
      totalIncome,
      totalExpenses,
      netProfit,
      totalHours,
      employeeCount: employees.filter(e => e.employment_status === 'active').length,
      jobCount: jobs.filter(j => j.status === 'active').length
    };

    const csv = Object.entries(reportData).map(([key, value]) => `${key},${value}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Reports & Analytics"
          description="Financial and operational insights"
          icon={BarChart3}
          actions={
            <div className="flex gap-3">
              <DateRangeFilter 
                onDateRangeChange={setDateRange}
                defaultRange="this_month"
              />
              <Button onClick={exportReport} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          }
        />

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger 
              value="financial" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-[#2A8FE3] data-[state=active]:text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Financiero' : 'Financial'}
            </TabsTrigger>
            <TabsTrigger 
              value="productivity" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-[#2A8FE3] data-[state=active]:text-white"
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Productividad' : 'Productivity'}
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-[#2A8FE3] data-[state=active]:text-white"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Clientes' : 'Clients'}
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-[#2A8FE3] data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Recursos' : 'Resources'}
            </TabsTrigger>
          </TabsList>

          {/* Financial Overview */}
          <TabsContent value="financial" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-slate-600">Income</CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-slate-600">Expenses</CardTitle>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-slate-600">Net Profit</CardTitle>
                  <DollarSign className="w-4 h-4 text-[#3B9FF3]" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-[#3B9FF3]' : 'text-red-600'}`}>
                    ${netProfit.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-slate-600">Total Hours</CardTitle>
                  <Clock className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</div>
                </CardContent>
              </Card>
            </div>

            {/* Income vs Expenses Chart */}
            <Card className="bg-white shadow-lg border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-slate-900">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getMonthlyData()}>
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
                    <Legend />
                    <Bar dataKey="income" fill="#3B9FF3" name="Income" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expenses" fill="#64748b" name="Expenses" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Hours by Employee */}
              <Card className="bg-white shadow-lg border-slate-200">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <UsersIcon className="w-5 h-5" />
                    Hours by Employee
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursByEmployee} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                      <XAxis type="number" stroke="rgba(100,116,139,0.8)" />
                      <YAxis dataKey="name" type="category" stroke="rgba(100,116,139,0.8)" width={120} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(226, 232, 240, 1)',
                          borderRadius: '8px',
                          color: '#0f172a'
                        }}
                      />
                      <Bar dataKey="hours" fill="#3B9FF3" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card className="bg-white shadow-lg border-slate-200">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-slate-900">Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
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
            </div>

            {/* Jobs Profitability */}
            {jobsProfitability.length > 0 && (
              <Card className="bg-white shadow-lg border-slate-200">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Briefcase className="w-5 h-5" />
                    Jobs Profitability
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={jobsProfitability}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                      <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" angle={-45} textAnchor="end" height={100} />
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
                      <Bar dataKey="revenue" fill="#3B9FF3" name="Revenue" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="cost" fill="#64748b" name="Cost" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Employee Productivity Tab */}
          <TabsContent value="productivity">
            <EmployeeProductivityReport
              employees={employees}
              timeEntries={timeEntries}
              jobs={jobs}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* Client Profitability Tab */}
          <TabsContent value="clients">
            <ClientProfitabilityReport
              customers={customers}
              jobs={jobs}
              invoices={invoices}
              expenses={expenses}
              timeEntries={timeEntries}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* Resource Allocation Tab */}
          <TabsContent value="resources">
            <ResourceAllocationReport
              teams={teams}
              employees={employees}
              jobs={jobs}
              assignments={assignments}
              timeEntries={timeEntries}
              dateRange={dateRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}