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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Job Filter
              </label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Jobs</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name || job.job_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Time Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
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
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Task Completion */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Task Completion
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {metrics.taskCompletionRate}%
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {metrics.completedTasks} of {metrics.totalTasks} tasks
                </p>
              </CardContent>
            </Card>

            {/* Dimensions Captured */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Dimensions Captured
                </CardTitle>
                <Ruler className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {metrics.totalDimensions}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {metrics.validatedDimensions} production-ready
                </p>
              </CardContent>
            </Card>

            {/* Photos Uploaded */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Photos Uploaded
                </CardTitle>
                <Camera className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {metrics.totalPhotos}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Documentation images
                </p>
              </CardContent>
            </Card>

            {/* Team Hours */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Labor Hours
                </CardTitle>
                <Clock className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {metrics.totalHours.toFixed(1)}h
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {metrics.uniqueWorkers} team members
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Job Details (if specific job selected) */}
          {metrics.selectedJob && (
            <Card className="mb-6 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/10 dark:to-yellow-900/10 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  {metrics.selectedJob.name || metrics.selectedJob.job_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Customer</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metrics.selectedJob.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Days Active</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metrics.daysActive} days
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Address</p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {metrics.selectedJob.address || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Last Activity</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
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

          {/* Alerts */}
          {metrics.pendingPunchItems > 0 && (
            <Card className="mb-6 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100">
                      {metrics.pendingPunchItems} Client Punch Item(s) Pending Review
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Action required: Review and resolve client-submitted items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Task Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No task data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Activity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {activityTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        labelFormatter={(date) => format(new Date(date), 'MMMM d, yyyy')}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="hours" stroke="#FF8C00" name="Hours" />
                      <Line type="monotone" dataKey="tasks" stroke="#507DB4" name="Tasks" />
                      <Line type="monotone" dataKey="dimensions" stroke="#A855F7" name="Dimensions" />
                      <Line type="monotone" dataKey="photos" stroke="#10B981" name="Photos" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No activity data for selected range
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Activity Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Team Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeamActivityTable timeEntries={allTimeEntries} tasks={allTasks} dimensions={allDimensions} />
            </CardContent>
          </Card>
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
      <div className="text-center py-8 text-slate-400">
        No team activity recorded
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Team Member
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Hours
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tasks
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Dimensions
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Last Active
            </th>
          </tr>
        </thead>
        <tbody>
          {teamStats.map((member, idx) => (
            <tr 
              key={member.email}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                </div>
              </td>
              <td className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-white">
                {member.hours.toFixed(1)}h
              </td>
              <td className="text-right py-3 px-4 text-slate-700 dark:text-slate-300">
                {member.tasks}
              </td>
              <td className="text-right py-3 px-4 text-slate-700 dark:text-slate-300">
                {member.dimensions}
              </td>
              <td className="text-right py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                {format(new Date(member.lastActive), 'MMM d, h:mm a')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}