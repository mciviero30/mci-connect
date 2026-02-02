/**
 * FASE 3C — INITIATIVE #1: FIELD PROGRESS DASHBOARD
 * 
 * READ-ONLY GUARANTEES:
 * - No .create() / .update() / .delete() calls
 * - No mutations to entities
 * - No background processes
 * - Aggregation and visualization only
 * 
 * ROLLBACK: Delete this file
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  MapPin, Ruler, Camera, Clock, Users, CheckCircle2, AlertCircle, 
  TrendingUp, Calendar, Download, RefreshCw 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

export default function FieldProgressDashboard() {
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [dateRange, setDateRange] = useState('7'); // days

  // READ-ONLY: Fetch jobs
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['field-progress-jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }, '-created_date', 100),
    staleTime: 60000,
  });

  // READ-ONLY: Fetch tasks
  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['field-progress-tasks', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.Task.filter({}, '-created_date', 500);
      }
      return base44.entities.Task.filter({ job_id: selectedJobId }, '-created_date', 500);
    },
    enabled: !!selectedJobId,
    staleTime: 30000,
  });

  // READ-ONLY: Fetch dimensions
  const { data: allDimensions = [], isLoading: loadingDimensions } = useQuery({
    queryKey: ['field-progress-dimensions', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.FieldDimension.filter({}, '-created_date', 500);
      }
      return base44.entities.FieldDimension.filter({ job_id: selectedJobId }, '-created_date', 500);
    },
    enabled: !!selectedJobId,
    staleTime: 30000,
  });

  // READ-ONLY: Fetch photos
  const { data: allPhotos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ['field-progress-photos', selectedJobId],
    queryFn: () => {
      if (selectedJobId === 'all') {
        return base44.entities.Photo.filter({}, '-created_date', 500);
      }
      return base44.entities.Photo.filter({ job_id: selectedJobId }, '-created_date', 500);
    },
    enabled: !!selectedJobId,
    staleTime: 30000,
  });

  // READ-ONLY: Fetch time entries
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['field-progress-time', selectedJobId, dateRange],
    queryFn: () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      
      if (selectedJobId === 'all') {
        return base44.entities.TimeEntry.filter({}, '-date', 200);
      }
      return base44.entities.TimeEntry.filter({ job_id: selectedJobId }, '-date', 200);
    },
    enabled: !!selectedJobId,
    staleTime: 60000,
  });

  // DERIVED METRICS (read-only computation)
  const metrics = useMemo(() => {
    const selectedJob = selectedJobId !== 'all' ? jobs.find(j => j.id === selectedJobId) : null;

    // Task metrics
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    const pendingPunchItems = allTasks.filter(t => t.created_by_client && t.punch_status === 'client_submitted').length;

    // Dimension metrics
    const totalDimensions = allDimensions.length;
    const validatedDimensions = allDimensions.filter(d => d.is_production_ready).length;

    // Photo metrics
    const totalPhotos = allPhotos.length;

    // Time metrics
    const daysActive = selectedJob 
      ? differenceInDays(new Date(), new Date(selectedJob.created_date))
      : 0;
    
    const totalHours = allTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    // Team activity
    const uniqueWorkers = new Set(allTimeEntries.map(e => e.employee_email)).size;
    const lastActivity = allTimeEntries.length > 0 
      ? allTimeEntries.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;

    return {
      totalTasks,
      completedTasks,
      taskCompletionRate,
      pendingPunchItems,
      totalDimensions,
      validatedDimensions,
      totalPhotos,
      daysActive,
      totalHours,
      uniqueWorkers,
      lastActivity,
      selectedJob,
    };
  }, [allTasks, allDimensions, allPhotos, allTimeEntries, jobs, selectedJobId]);

  // DERIVED: Task status breakdown
  const taskStatusData = useMemo(() => {
    const statusCount = allTasks.reduce((acc, task) => {
      const status = task.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
    }));
  }, [allTasks]);

  // DERIVED: Daily activity trend
  const activityTrend = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));

    const dailyStats = {};
    
    allTimeEntries.forEach(entry => {
      const date = entry.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { date, hours: 0, tasks: 0, dimensions: 0, photos: 0 };
      }
      dailyStats[date].hours += entry.hours_worked || 0;
    });

    allTasks.forEach(task => {
      const date = task.created_date?.split('T')[0];
      if (date && dailyStats[date]) {
        dailyStats[date].tasks += 1;
      }
    });

    allDimensions.forEach(dim => {
      const date = dim.created_date?.split('T')[0];
      if (date && dailyStats[date]) {
        dailyStats[date].dimensions += 1;
      }
    });

    allPhotos.forEach(photo => {
      const date = photo.created_date?.split('T')[0];
      if (date && dailyStats[date]) {
        dailyStats[date].photos += 1;
      }
    });

    return Object.values(dailyStats)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-parseInt(dateRange));
  }, [allTimeEntries, allTasks, allDimensions, allPhotos, dateRange]);

  const isLoading = loadingJobs || loadingTasks || loadingDimensions || loadingPhotos;

  const COLORS = ['#FF8C00', '#FFB347', '#507DB4', '#6B9DD8', '#10B981', '#F59E0B'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-4 md:p-6">
      <PageHeader 
        title="Field Progress Dashboard"
        description="Real-time job completion visibility and team activity tracking"
        Icon={TrendingUp}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="min-h-[48px]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters - Enhanced visual hierarchy */}
      <Card className="mb-8 shadow-enterprise-md border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                Job Filter
              </label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Select job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-semibold">All Active Jobs</span>
                  </SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name || job.job_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                Time Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <RefreshCw className="w-12 h-12 text-[#507DB4] animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading field progress data...</p>
        </div>
      ) : (
        <>
          {/* ========================================= */}
          {/* SECTION 1: JOB PROGRESS OVERVIEW          */}
          {/* ========================================= */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-[#507DB4]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Job Progress Overview
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Task Completion */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700 hover:shadow-enterprise-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Task Completion
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent mb-2">
                    {metrics.taskCompletionRate}%
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{metrics.completedTasks}</span> of {metrics.totalTasks} tasks completed
                  </p>
                  <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all"
                      style={{ width: `${metrics.taskCompletionRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Dimensions Captured */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700 hover:shadow-enterprise-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Dimensions
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Ruler className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent mb-2">
                    {metrics.totalDimensions}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-green-600 dark:text-green-400">{metrics.validatedDimensions}</span> production-ready
                  </p>
                  {metrics.totalDimensions > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                      {((metrics.validatedDimensions / metrics.totalDimensions) * 100).toFixed(0)}% validated
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Photos Uploaded */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700 hover:shadow-enterprise-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Photos
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-2">
                    {metrics.totalPhotos}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Documentation images
                  </p>
                </CardContent>
              </Card>

              {/* Team Hours */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700 hover:shadow-enterprise-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Labor Hours
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2">
                    {metrics.totalHours.toFixed(1)}h
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{metrics.uniqueWorkers}</span> team members active
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Job Context Card (if specific job selected) */}
          {metrics.selectedJob && (
            <Card className="mb-8 shadow-enterprise-lg border-2 border-[#507DB4]/20 dark:border-[#507DB4]/40 bg-gradient-to-br from-blue-50/50 to-slate-50 dark:from-slate-800 dark:to-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                        {metrics.selectedJob.name || metrics.selectedJob.job_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Job ID: {metrics.selectedJob.job_number || metrics.selectedJob.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {metrics.selectedJob.customer_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Days Active</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#507DB4]" />
                      {metrics.daysActive} days
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={metrics.selectedJob.address}>
                      {metrics.selectedJob.address || 'No address'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Activity</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {metrics.lastActivity 
                        ? format(new Date(metrics.lastActivity.created_date), 'MMM d, h:mm a')
                        : 'No activity'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Required Alert */}
          {metrics.pendingPunchItems > 0 && (
            <Card className="mb-8 border-2 border-purple-400 dark:border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 shadow-enterprise-lg">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-purple-500 shadow-lg flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-purple-900 dark:text-purple-100 mb-1">
                      {metrics.pendingPunchItems} Client Punch Item{metrics.pendingPunchItems > 1 ? 's' : ''} Pending Review
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Action required: Review and resolve client-submitted items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================= */}
          {/* SECTION 2: ACTIVITY METRICS               */}
          {/* ========================================= */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-[#507DB4]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Activity Metrics
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Status Breakdown */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Task Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {taskStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">No task data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Trend */}
              <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Daily Activity Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {activityTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={activityTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip 
                          labelFormatter={(date) => format(new Date(date), 'MMMM d, yyyy')}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '16px' }}
                          iconType="circle"
                        />
                        <Line type="monotone" dataKey="hours" stroke="#FF8C00" strokeWidth={2} name="Hours" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="tasks" stroke="#507DB4" strokeWidth={2} name="Tasks" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="dimensions" stroke="#A855F7" strokeWidth={2} name="Dimensions" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="photos" stroke="#10B981" strokeWidth={2} name="Photos" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                      <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">No activity data for selected range</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ========================================= */}
          {/* SECTION 3: TEAM ACTIVITY SNAPSHOT         */}
          {/* ========================================= */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-[#507DB4]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Team Activity Snapshot
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
            </div>

            <Card className="shadow-enterprise-md border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    Team Performance Summary
                  </CardTitle>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {metrics.uniqueWorkers} active members
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <TeamActivityTable timeEntries={allTimeEntries} tasks={allTasks} dimensions={allDimensions} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * READ-ONLY: Team activity aggregation component
 */
function TeamActivityTable({ timeEntries, tasks, dimensions }) {
  const teamStats = useMemo(() => {
    const stats = {};

    // Aggregate by employee
    timeEntries.forEach(entry => {
      const email = entry.employee_email;
      if (!stats[email]) {
        stats[email] = {
          email,
          name: entry.employee_name,
          hours: 0,
          tasks: 0,
          dimensions: 0,
          lastActive: entry.created_date,
        };
      }
      stats[email].hours += entry.hours_worked || 0;
      if (new Date(entry.created_date) > new Date(stats[email].lastActive)) {
        stats[email].lastActive = entry.created_date;
      }
    });

    tasks.forEach(task => {
      const email = task.created_by;
      if (stats[email]) {
        stats[email].tasks += 1;
      }
    });

    dimensions.forEach(dim => {
      const email = dim.measured_by;
      if (stats[email]) {
        stats[email].dimensions += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.hours - a.hours);
  }, [timeEntries, tasks, dimensions]);

  if (teamStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No team activity recorded</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Time entries will appear here once logged</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Team Member
            </th>
            <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Hours
            </th>
            <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Tasks
            </th>
            <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Dimensions
            </th>
            <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Last Active
            </th>
          </tr>
        </thead>
        <tbody>
          {teamStats.map((member, idx) => (
            <tr 
              key={member.email}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-bold text-sm">
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                  </div>
                </div>
              </td>
              <td className="text-right py-4 px-6">
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {member.hours.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">hrs</span>
              </td>
              <td className="text-right py-4 px-6">
                <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {member.tasks}
                </span>
              </td>
              <td className="text-right py-4 px-6">
                <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {member.dimensions}
                </span>
              </td>
              <td className="text-right py-4 px-6">
                <div className="flex items-center justify-end gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {format(new Date(member.lastActive), 'MMM d, h:mm a')}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}