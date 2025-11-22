import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, DollarSign, Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import ExportButtons from '../components/reportes/ExportButtons';
import { exportToCSV } from '../components/reportes/ExportButtons';

export default function TimeReports() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState('month');
  const [selectedJob, setSelectedJob] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date'),
    staleTime: 300000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.list(),
    staleTime: 600000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['activeEmployees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.employment_status === 'active');
    },
    staleTime: 600000,
  });

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    let filtered = timeEntries;
    const now = new Date();
    let start, end;

    if (dateRange === 'week') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else if (dateRange === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    if (start && end) {
      filtered = filtered.filter(entry => 
        isWithinInterval(new Date(entry.date), { start, end })
      );
    }

    if (selectedJob !== 'all') {
      filtered = filtered.filter(e => e.job_id === selectedJob);
    }

    return filtered;
  }, [timeEntries, dateRange, selectedJob]);

  // Calculate project costing
  const projectCosts = useMemo(() => {
    const costs = {};
    
    filteredEntries.forEach(entry => {
      const jobId = entry.job_id || 'no-job';
      if (!costs[jobId]) {
        const job = jobs.find(j => j.id === entry.job_id);
        const employee = employees.find(e => e.email === entry.employee_email);
        
        costs[jobId] = {
          jobId,
          jobName: job?.name || 'No Job',
          contractAmount: job?.contract_amount || 0,
          totalHours: 0,
          normalHours: 0,
          overtimeHours: 0,
          laborCost: 0,
          employees: new Set()
        };
      }
      
      const employee = employees.find(e => e.email === entry.employee_email);
      const hourlyRate = employee?.hourly_rate || 20;
      const hours = entry.hours_worked || 0;
      const overtimeMultiplier = entry.hour_type === 'overtime' ? 1.5 : 1;
      
      costs[jobId].totalHours += hours;
      if (entry.hour_type === 'overtime') {
        costs[jobId].overtimeHours += hours;
      } else {
        costs[jobId].normalHours += hours;
      }
      costs[jobId].laborCost += hours * hourlyRate * overtimeMultiplier;
      costs[jobId].employees.add(entry.employee_email);
    });

    return Object.values(costs)
      .map(c => ({
        ...c,
        employees: c.employees.size,
        profit: c.contractAmount - c.laborCost,
        profitMargin: c.contractAmount > 0 ? ((c.contractAmount - c.laborCost) / c.contractAmount * 100) : 0
      }))
      .sort((a, b) => b.laborCost - a.laborCost);
  }, [filteredEntries, jobs, employees]);

  // Time allocation by work type
  const workTypeData = useMemo(() => {
    const types = { normal: 0, driving: 0, setup: 0, cleanup: 0 };
    filteredEntries.forEach(entry => {
      types[entry.work_type || 'normal'] += entry.hours_worked || 0;
    });
    
    return Object.entries(types)
      .filter(([_, hours]) => hours > 0)
      .map(([type, hours]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: parseFloat(hours.toFixed(1))
      }));
  }, [filteredEntries]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

  const exportData = useMemo(() => {
    return projectCosts.map(cost => ({
      'Job': cost.jobName,
      'Total Hours': cost.totalHours.toFixed(2),
      'Normal Hours': cost.normalHours.toFixed(2),
      'Overtime Hours': cost.overtimeHours.toFixed(2),
      'Labor Cost': `$${cost.laborCost.toFixed(2)}`,
      'Contract Amount': `$${cost.contractAmount.toFixed(2)}`,
      'Profit': `$${cost.profit.toFixed(2)}`,
      'Profit Margin': `${cost.profitMargin.toFixed(1)}%`,
      'Employees': cost.employees
    }));
  }, [projectCosts]);

  const totalStats = useMemo(() => {
    const total = filteredEntries.reduce((acc, e) => ({
      hours: acc.hours + (e.hours_worked || 0),
      cost: acc.cost + calculateEntryCost(e, employees)
    }), { hours: 0, cost: 0 });

    const totalRevenue = projectCosts.reduce((sum, c) => sum + c.contractAmount, 0);
    const totalProfit = projectCosts.reduce((sum, c) => sum + c.profit, 0);

    return {
      totalHours: total.hours.toFixed(1),
      totalCost: total.cost.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      avgProfitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
    };
  }, [filteredEntries, projectCosts, employees]);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Reportes de Tiempo' : 'Time Reports'}
          description={language === 'es' 
            ? 'Análisis detallado de tiempo y costos por proyecto' 
            : 'Detailed time and cost analysis by project'}
          icon={BarChart3}
          actions={
            <Button 
              onClick={() => exportToCSV(exportData, 'time-report')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
            </Button>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {language === 'es' ? 'Total Horas' : 'Total Hours'}
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalStats.totalHours}</p>
                </div>
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                    {language === 'es' ? 'Costo Laboral' : 'Labor Cost'}
                  </p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">${totalStats.totalCost}</p>
                </div>
                <DollarSign className="w-10 h-10 text-red-600 dark:text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
                    {language === 'es' ? 'Ingresos' : 'Revenue'}
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${totalStats.totalRevenue}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600 dark:text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                    {language === 'es' ? 'Ganancia' : 'Profit'}
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">${totalStats.totalProfit}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">
                    {language === 'es' ? 'Margen' : 'Margin'}
                  </p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{totalStats.avgProfitMargin}%</p>
                </div>
                <BarChart3 className="w-10 h-10 text-amber-600 dark:text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="week">{language === 'es' ? 'Esta Semana' : 'This Week'}</SelectItem>
                  <SelectItem value="month">{language === 'es' ? 'Este Mes' : 'This Month'}</SelectItem>
                  <SelectItem value="all">{language === 'es' ? 'Todo' : 'All Time'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-52 bg-white dark:bg-[#282828]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">{language === 'es' ? 'Todos los Trabajos' : 'All Jobs'}</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Work Type Distribution */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Distribución por Tipo de Trabajo' : 'Work Type Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {workTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Jobs by Hours */}
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Top Trabajos por Horas' : 'Top Jobs by Hours'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectCosts.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="jobName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalHours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Project Costing Table */}
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              {language === 'es' ? 'Costos por Proyecto' : 'Project Costing'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Trabajo' : 'Job'}
                    </th>
                    <th className="text-right p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Horas' : 'Hours'}
                    </th>
                    <th className="text-right p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Costo Laboral' : 'Labor Cost'}
                    </th>
                    <th className="text-right p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Contrato' : 'Contract'}
                    </th>
                    <th className="text-right p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Ganancia' : 'Profit'}
                    </th>
                    <th className="text-right p-3 text-slate-900 dark:text-white">
                      {language === 'es' ? 'Margen' : 'Margin'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectCosts.map(cost => (
                    <tr key={cost.jobId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-slate-900 dark:text-white font-medium">{cost.jobName}</td>
                      <td className="p-3 text-right text-slate-900 dark:text-white">{cost.totalHours.toFixed(1)}h</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">${cost.laborCost.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-900 dark:text-white">${cost.contractAmount.toFixed(2)}</td>
                      <td className={`p-3 text-right font-bold ${cost.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${cost.profit.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right font-bold ${cost.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {cost.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function calculateEntryCost(entry, employees) {
  const employee = employees.find(e => e.email === entry.employee_email);
  const hourlyRate = employee?.hourly_rate || 20;
  const overtimeMultiplier = entry.hour_type === 'overtime' ? 1.5 : 1;
  return (entry.hours_worked || 0) * hourlyRate * overtimeMultiplier;
}