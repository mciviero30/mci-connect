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

const n = (v, d = 2) => (Number(v) || 0).toFixed(d);


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
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.list(),
    staleTime: 600000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['activeEmployees'],
    queryFn: async () => {
      // SSOT: use EmployeeDirectory (has hourly_rate) instead of User entity
      return base44.entities.EmployeeDirectory.filter({ status: 'active' }, 'full_name', 500);
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

  // (Weekly OT tracking — used inside projectCosts memo below)
  // Calculate weekly OT per employee (work hours only, driving excluded — Mon-Sun week)
  const weeklyWorkHoursPerEmployee = useMemo(() => {
    // weekKey = "userId_YYYY-Www" (ISO Mon-Sun)
    const weekMap = {};
    filteredEntries.forEach(entry => {
      if (entry.work_type === 'driving') return; // driving never counts toward OT
      const empKey = entry.user_id || entry.employee_email;
      const d = new Date(entry.date + 'T12:00:00'); // noon to avoid DST issues
      // ISO week: Monday = day 1
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mon … 6=Sun
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek);
      const weekKey = `${empKey}_${monday.toISOString().split('T')[0]}`;
      if (!weekMap[weekKey]) weekMap[weekKey] = 0;
      weekMap[weekKey] += entry.hours_worked || 0;
    });
    return weekMap;
  }, [filteredEntries]);

  // Calculate project costing using weekly OT rule
  const projectCosts = useMemo(() => {
    // First pass: build per-employee weekly cumulative tracker
    const empWeekCumulative = {}; // empKey_weekKey → hours consumed so far

    // Sort entries by date so we process them in order
    const sorted = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));

    const costs = {};

    sorted.forEach(entry => {
      const jobId = entry.job_id || 'no-job';
      if (!costs[jobId]) {
        const job = jobs.find(j => j.id === entry.job_id);
        costs[jobId] = {
          jobId,
          jobName: job?.name || 'No Job',
          contractAmount: job?.contract_amount || 0,
          totalHours: 0,
          normalHours: 0,
          overtimeHours: 0,
          drivingHours: 0,
          laborCost: 0,
          employees: new Set()
        };
      }

      const empKey = entry.user_id || entry.employee_email;
      // SSOT: prefer user_id, fallback to email for legacy entries
      const employee = employees.find(e => e.user_id === entry.user_id)
        || employees.find(e => e.employee_email === entry.employee_email);
      const hourlyRate = employee?.hourly_rate || 20;
      const hours = entry.hours_worked || 0;
      const isDriving = entry.work_type === 'driving';

      costs[jobId].totalHours += hours;
      costs[jobId].employees.add(empKey);

      if (isDriving) {
        costs[jobId].drivingHours += hours;
        costs[jobId].laborCost += hours * hourlyRate; // driving at regular rate always
        return;
      }

      // Determine OT for this work entry based on weekly cumulative
      const d = new Date(entry.date + 'T12:00:00');
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - dayOfWeek);
      const weekKey = `${empKey}_${monday.toISOString().split('T')[0]}`;

      if (!empWeekCumulative[weekKey]) empWeekCumulative[weekKey] = 0;
      const prevCumulative = empWeekCumulative[weekKey];
      empWeekCumulative[weekKey] += hours;

      const regularPortion = Math.max(0, Math.min(hours, 40 - prevCumulative));
      const overtimePortion = hours - regularPortion;

      costs[jobId].normalHours += regularPortion;
      costs[jobId].overtimeHours += overtimePortion;
      costs[jobId].laborCost += regularPortion * hourlyRate + overtimePortion * hourlyRate * 1.5;
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
        value: parseFloat(n(hours, 1))
      }));
  }, [filteredEntries]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

  const exportData = useMemo(() => {
    return projectCosts.map(cost => ({
      'Job': cost.jobName,
      'Total Hours': n(cost.totalHours, 2),
      'Normal Hours': n(cost.normalHours, 2),
      'Overtime Hours': n(cost.overtimeHours, 2),
      'Labor Cost': `$${n(cost.laborCost, 2)}`,
      'Contract Amount': `$${n(cost.contractAmount, 2)}`,
      'Profit': `$${n(cost.profit, 2)}`,
      'Profit Margin': `${n(cost.profitMargin, 1)}%`,
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
      totalHours: n(total.hours, 1),
      totalCost: n(total.cost, 2),
      totalRevenue: n(totalRevenue, 2),
      totalProfit: n(totalProfit, 2),
      avgProfitMargin: totalRevenue > 0 ? n((totalProfit / totalRevenue) * 100, 1) : 0
    };
  }, [filteredEntries, projectCosts, employees]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'Reportes de Tiempo' : 'Time Reports'}
          description={language === 'es' 
            ? 'Análisis detallado de tiempo y costos por proyecto' 
            : 'Detailed time and cost analysis by project'}
          icon={BarChart3}
          actions={
            <Button 
              onClick={() => exportToCSV(exportData, 'time-report')}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
            </Button>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {language === 'es' ? 'Total Horas' : 'Total Hours'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalStats.totalHours}</p>
                </div>
                <Clock className="w-10 h-10 text-slate-700 dark:text-slate-300 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {language === 'es' ? 'Costo Laboral' : 'Labor Cost'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalStats.totalCost}</p>
                </div>
                <DollarSign className="w-10 h-10 text-slate-700 dark:text-slate-300 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {language === 'es' ? 'Ingresos' : 'Revenue'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalStats.totalRevenue}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-slate-700 dark:text-slate-300 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {language === 'es' ? 'Ganancia' : 'Profit'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalStats.totalProfit}</p>
                </div>
                <DollarSign className="w-10 h-10 text-slate-700 dark:text-slate-300 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {language === 'es' ? 'Margen' : 'Margin'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalStats.avgProfitMargin}%</p>
                </div>
                <BarChart3 className="w-10 h-10 text-slate-700 dark:text-slate-300 opacity-30" />
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
                    label={({ name, percent }) => `${name}: ${n(percent * 100, 0)}%`}
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
                      <td className="p-3 text-right text-slate-900 dark:text-white">{n(cost.totalHours, 1)}h</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">${n(cost.laborCost, 2)}</td>
                      <td className="p-3 text-right text-slate-900 dark:text-white">${n(cost.contractAmount, 2)}</td>
                      <td className={`p-3 text-right font-bold ${cost.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${n(cost.profit, 2)}
                      </td>
                      <td className={`p-3 text-right font-bold ${cost.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {n(cost.profitMargin, 1)}%
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
  // SSOT: prefer user_id match, fallback to email for legacy entries
  const employee = employees.find(e => e.user_id === entry.user_id)
    || employees.find(e => e.employee_email === entry.employee_email);
  const hourlyRate = employee?.hourly_rate || 20;
  // Driving always at regular rate; work OT is computed weekly in projectCosts, not per-entry
  return (entry.hours_worked || 0) * hourlyRate;
}