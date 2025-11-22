import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import { BarChart3, TrendingUp, Users, DollarSign, Clock, CheckCircle, Bell, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomReportBuilder from '../components/reporting/CustomReportBuilder';
import { exportToCSV, exportToPDF } from '../components/reportes/ExportButtons';

const COLORS = ['#3B9FF3', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportingHub() {
  const { t, language } = useLanguage();
  const [dateRange, setDateRange] = useState('30');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  const startDate = useMemo(() => {
    const days = parseInt(dateRange);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }, [dateRange]);

  const endDate = new Date().toISOString().split('T')[0];

  // Fetch all data
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000),
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 500),
    initialData: []
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list('-created_date', 200),
    initialData: []
  });

  // Filter data by date range
  const filteredData = useMemo(() => {
    const filterByDate = (item, dateField) => {
      if (!item[dateField]) return false;
      return item[dateField] >= startDate && item[dateField] <= endDate;
    };

    return {
      timeEntries: timeEntries.filter(t => filterByDate(t, 'date')),
      invoices: invoices.filter(i => filterByDate(i, 'invoice_date')),
      expenses: expenses.filter(e => filterByDate(e, 'date')),
      notifications: notifications.filter(n => filterByDate(n, 'created_date')),
      recognitions: recognitions.filter(r => filterByDate(r, 'created_date'))
    };
  }, [timeEntries, invoices, expenses, notifications, recognitions, startDate, endDate]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeEmployees = employees.filter(e => e.employment_status === 'active');
    
    // Employee Performance
    const totalHours = filteredData.timeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const avgHoursPerEmployee = activeEmployees.length > 0 ? totalHours / activeEmployees.length : 0;
    
    // Project Completion
    const completedJobs = jobs.filter(j => j.status === 'completed' && 
      j.completed_date >= startDate && j.completed_date <= endDate);
    const completionRate = jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0;
    
    // Financial Summary
    const totalRevenue = filteredData.invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    
    // Notification Engagement
    const readRate = notifications.length > 0 
      ? (notifications.filter(n => n.is_read).length / notifications.length) * 100 
      : 0;
    const avgResponseTime = filteredData.notifications
      .filter(n => n.is_read && n.read_date)
      .reduce((sum, n) => {
        const diff = new Date(n.read_date) - new Date(n.created_date);
        return sum + diff;
      }, 0) / Math.max(filteredData.notifications.filter(n => n.is_read).length, 1);
    
    return {
      activeEmployees: activeEmployees.length,
      totalHours,
      avgHoursPerEmployee,
      completedJobs: completedJobs.length,
      completionRate,
      totalRevenue,
      totalExpenses,
      profitMargin,
      notificationsSent: filteredData.notifications.length,
      notificationsRead: filteredData.notifications.filter(n => n.is_read).length,
      readRate,
      avgResponseTime: avgResponseTime / (1000 * 60 * 60) // Convert to hours
    };
  }, [employees, filteredData, jobs, notifications, startDate, endDate]);

  // Employee Performance Chart Data
  const employeePerformanceData = useMemo(() => {
    const empMap = {};
    filteredData.timeEntries.forEach(entry => {
      if (!empMap[entry.employee_name]) {
        empMap[entry.employee_name] = { 
          name: entry.employee_name,
          hours: 0,
          recognitions: 0
        };
      }
      empMap[entry.employee_name].hours += entry.hours_worked || 0;
    });

    filteredData.recognitions.forEach(rec => {
      if (empMap[rec.employee_name]) {
        empMap[rec.employee_name].recognitions += rec.points || 0;
      }
    });

    return Object.values(empMap)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filteredData]);

  // Project Status Distribution
  const projectStatusData = useMemo(() => {
    const statusCount = {};
    jobs.forEach(job => {
      statusCount[job.status] = (statusCount[job.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  // Financial Trend Data (last 6 months)
  const financialTrendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthInvoices = invoices.filter(inv => 
        inv.invoice_date >= format(start, 'yyyy-MM-dd') && 
        inv.invoice_date <= format(end, 'yyyy-MM-dd')
      );
      
      const monthExpenses = expenses.filter(exp => 
        exp.date >= format(start, 'yyyy-MM-dd') && 
        exp.date <= format(end, 'yyyy-MM-dd')
      );
      
      months.push({
        month: format(date, 'MMM'),
        revenue: monthInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
        expenses: monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      });
    }
    return months;
  }, [invoices, expenses]);

  // Notification Engagement by Type
  const notificationEngagementData = useMemo(() => {
    const typeMap = {};
    filteredData.notifications.forEach(notif => {
      if (!typeMap[notif.type]) {
        typeMap[notif.type] = { total: 0, read: 0 };
      }
      typeMap[notif.type].total++;
      if (notif.is_read) typeMap[notif.type].read++;
    });

    return Object.entries(typeMap).map(([type, data]) => ({
      type: type.replace(/_/g, ' '),
      sent: data.total,
      read: data.read,
      readRate: data.total > 0 ? (data.read / data.total) * 100 : 0
    }));
  }, [filteredData]);

  const handleExportSummary = () => {
    const data = [
      {
        Metric: 'Active Employees',
        Value: kpis.activeEmployees
      },
      {
        Metric: 'Total Hours Worked',
        Value: kpis.totalHours.toFixed(2)
      },
      {
        Metric: 'Avg Hours per Employee',
        Value: kpis.avgHoursPerEmployee.toFixed(2)
      },
      {
        Metric: 'Completed Jobs',
        Value: kpis.completedJobs
      },
      {
        Metric: 'Completion Rate',
        Value: `${kpis.completionRate.toFixed(1)}%`
      },
      {
        Metric: 'Total Revenue',
        Value: `$${kpis.totalRevenue.toFixed(2)}`
      },
      {
        Metric: 'Total Expenses',
        Value: `$${kpis.totalExpenses.toFixed(2)}`
      },
      {
        Metric: 'Profit Margin',
        Value: `${kpis.profitMargin.toFixed(1)}%`
      },
      {
        Metric: 'Notifications Read Rate',
        Value: `${kpis.readRate.toFixed(1)}%`
      }
    ];

    exportToCSV(data, 'Analytics_Summary');
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Advanced Analytics & Reporting"
          description="Comprehensive business intelligence and custom reports"
          icon={BarChart3}
          actions={
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExportSummary} variant="outline" className="border-blue-300 dark:border-blue-600">
                <Download className="w-4 h-4 mr-2" />
                Export Summary
              </Button>
              <Button onClick={() => setShowCustomBuilder(true)} className="bg-gradient-to-r from-blue-600 to-blue-700">
                <Filter className="w-4 h-4 mr-2" />
                Custom Report
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Hours/Employee</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {kpis.avgHoursPerEmployee.toFixed(1)}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completion Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {kpis.completionRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Profit Margin</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {kpis.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Notification Read Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {kpis.readRate.toFixed(1)}%
                  </p>
                </div>
                <Bell className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Employee Performance */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-blue-600" />
                Top Employee Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill={COLORS[0]} name="Hours Worked" />
                  <Bar dataKey="recognitions" fill={COLORS[1]} name="Recognition Points" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Status */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Project Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Financial Trend */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Revenue vs Expenses (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={financialTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS[1]} strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke={COLORS[3]} strokeWidth={2} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Notification Engagement */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Bell className="w-5 h-5 text-purple-600" />
                Notification Engagement by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={notificationEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill={COLORS[4]} name="Sent" />
                  <Bar dataKey="read" fill={COLORS[1]} name="Read" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Revenue:</span>
                <span className="font-bold text-green-600">${kpis.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Expenses:</span>
                <span className="font-bold text-red-600">${kpis.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white font-semibold">Net Profit:</span>
                <span className="font-bold text-blue-600">${(kpis.totalRevenue - kpis.totalExpenses).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Workforce Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Active Employees:</span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis.activeEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Hours:</span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis.totalHours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Recognitions Given:</span>
                <span className="font-bold text-slate-900 dark:text-white">{filteredData.recognitions.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Communication Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Notifications Sent:</span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis.notificationsSent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Read Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis.readRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Avg Response Time:</span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis.avgResponseTime.toFixed(1)}h</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Custom Report Builder Dialog */}
        {showCustomBuilder && (
          <CustomReportBuilder
            open={showCustomBuilder}
            onClose={() => setShowCustomBuilder(false)}
          />
        )}
      </div>
    </div>
  );
}