import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import AIPredictiveJobAnalytics from "@/components/ai/AIPredictiveJobAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Award,
  AlertTriangle,
  CheckCircle2,
  Target,
  Users,
  MapPin, // NEW: Added for team profitability section
  Building2 // NEW: Added for team profitability section
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
// NEW: Added for team profitability table
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function JobPerformanceAnalysis() {
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 500),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 500),
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'), // Modified: Added 'team_name' for sorting
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // NEW: Query for expenses for profitability calculation
  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 500),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const employeeRateMap = new Map(employees?.map(emp => [emp.email, emp.hourly_rate || 25]));

  // Calculate performance for each job
  const jobsPerformance = jobs.map(job => {
    const approvedQuote = quotes?.find(q =>
      q.job_id === job.id &&
      (q.status === 'approved' || q.status === 'converted_to_invoice')
    );

    const estimatedHours = approvedQuote?.estimated_hours || 0;

    const jobTimeEntries = timeEntries?.filter(t =>
      t.job_id === job.id && t.status === 'approved'
    ) || [];

    const actualHours = jobTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    const laborCost = jobTimeEntries.reduce((sum, entry) => {
      const rate = employeeRateMap.get(entry.employee_email) || 25;
      const hours = entry.hours_worked || 0;
      // This is a simplified calculation, full overtime rules would be more complex
      // For now, assuming a flat rate and no overtime logic here to match overall calculations consistency
      return sum + (hours * rate);
    }, 0);

    const hoursDifference = estimatedHours - actualHours;
    const efficiency = estimatedHours > 0 && actualHours > 0 ? ((estimatedHours / actualHours) * 100) : 0;

    return {
      ...job,
      estimatedHours,
      actualHours,
      hoursDifference,
      efficiency,
      laborCost,
      hasData: estimatedHours > 0 && actualHours > 0
    };
  }).filter(job => job.hasData);

  // Filter jobs
  const filteredJobs = jobsPerformance.filter(job => {
    const teamMatch = filterTeam === 'all' || job.team_id === filterTeam;
    const statusMatch = filterStatus === 'all' || job.status === filterStatus;
    return teamMatch && statusMatch;
  });

  // Overall metrics
  const totalEstimatedHours = filteredJobs.reduce((sum, job) => sum + job.estimatedHours, 0);
  const totalActualHours = filteredJobs.reduce((sum, job) => sum + job.actualHours, 0);
  const totalLaborCost = filteredJobs.reduce((sum, job) => sum + job.laborCost, 0);
  const overallEfficiency = totalEstimatedHours > 0 ? ((totalEstimatedHours / totalActualHours) * 100) : 0;
  const averageEfficiency = filteredJobs.length > 0
    ? filteredJobs.reduce((sum, job) => sum + job.efficiency, 0) / filteredJobs.length
    : 0;

  const efficientJobs = filteredJobs.filter(job => job.efficiency >= 100).length;
  const inefficientJobs = filteredJobs.filter(job => job.efficiency < 100).length;

  // Team performance
  const teamPerformance = teams?.map(team => {
    const teamJobs = filteredJobs.filter(job => job.team_id === team.id);
    const teamEstimated = teamJobs.reduce((sum, job) => sum + job.estimatedHours, 0);
    const teamActual = teamJobs.reduce((sum, job) => sum + job.actualHours, 0);
    const teamEfficiency = teamEstimated > 0 ? ((teamEstimated / teamActual) * 100) : 0;

    return {
      name: team.team_name,
      efficiency: teamEfficiency,
      jobs: teamJobs.length,
      estimatedHours: teamEstimated,
      actualHours: teamActual
    };
  }).filter(t => t.jobs > 0) || [];

  // Chart data for top/bottom performers
  const sortedByEfficiency = [...filteredJobs].sort((a, b) => b.efficiency - a.efficiency);
  const topPerformers = sortedByEfficiency.slice(0, 10);
  const bottomPerformers = sortedByEfficiency.slice(-10).reverse();

  // NEW: Prompt #66 - Team-Level Aggregated Profitability
  const teamProfitabilityData = useMemo(() => {
    if (!teams || !jobs || !timeEntries || !expenses) return [];

    return teams.map(team => {
      // Get all jobs for this team
      const teamJobs = jobs.filter(job => job.team_id === team.id);
      const completedJobs = teamJobs.filter(job => job.status === 'completed');

      // Calculate total labor hours for team (across all jobs, not just completed)
      const teamTimeEntries = timeEntries.filter(entry =>
        teamJobs.some(job => job.id === entry.job_id)
      );
      const totalLaborHours = teamTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

      // Calculate average profit margin
      let totalRevenue = 0;
      let totalCosts = 0;

      for (const job of completedJobs) {
        const revenue = job.contract_amount || 0;
        totalRevenue += revenue;

        // Calculate costs (materials + labor)
        const jobTimeEntries = timeEntries.filter(entry => entry.job_id === job.id);
        const laborHours = jobTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
        const laborCost = laborHours * 25; // Assuming $25/hour average as per prompt

        const jobExpenses = expenses.filter(exp => exp.job_id === job.id);
        const expenseCost = jobExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        totalCosts += laborCost + expenseCost;
      }

      const profit = totalRevenue - totalCosts;
      const averageProfitMargin = totalRevenue > 0
        ? (profit / totalRevenue * 100)
        : 0; // If no revenue, margin is 0

      return {
        teamId: team.id,
        teamName: team.team_name,
        location: team.location,
        totalProjects: completedJobs.length,
        averageProfitMargin: averageProfitMargin, // Keep as number for sorting, format in render
        totalLaborHours: totalLaborHours, // Keep as number for sorting, format in render
        totalRevenue,
        totalCosts
      };
    }).filter(team => team.totalProjects > 0); // Only show teams with completed projects
  }, [teams, jobs, timeEntries, expenses]);


  const isLoading = loadingJobs;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Job Performance Analysis"
          description="Compare estimated vs actual hours across all projects"
          icon={BarChart3}
          actions={
            <div className="flex gap-3">
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-40 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Teams</SelectItem>
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Status</SelectItem>
                  <SelectItem value="active" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Active</SelectItem>
                  <SelectItem value="completed" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Overall Efficiency</CardTitle>
              <Target className="w-5 h-5 text-[#3B9FF3]" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${overallEfficiency >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {overallEfficiency.toFixed(0)}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {totalEstimatedHours.toFixed(0)}h est. / {totalActualHours.toFixed(0)}h actual
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Efficient Jobs</CardTitle>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{efficientJobs}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {filteredJobs.length > 0 ? ((efficientJobs / filteredJobs.length) * 100).toFixed(0) : 0}% of total jobs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Needs Improvement</CardTitle>
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{inefficientJobs}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Below 100% efficiency
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Total Labor Cost</CardTitle>
              <DollarSign className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3B9FF3] dark:text-blue-400">
                ${totalLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {totalActualHours.toFixed(0)} total hours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Prompt #66 - Team Profitability Section */}
        <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <MapPin className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
              Team-Level Profitability Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {teamProfitabilityData.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No Profitability Data</h3>
                <p className="text-slate-500 dark:text-slate-400">No completed projects found with revenue or expenses for teams.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <TableHead className="text-left p-4 text-slate-700 dark:text-slate-300 font-semibold">Team Name</TableHead>
                      <TableHead className="text-left p-4 text-slate-700 dark:text-slate-300 font-semibold">Location</TableHead>
                      <TableHead className="text-center p-4 text-slate-700 dark:text-slate-300 font-semibold">Total Projects</TableHead>
                      <TableHead className="text-center p-4 text-slate-700 dark:text-slate-300 font-semibold">Avg Profit Margin</TableHead>
                      <TableHead className="text-center p-4 text-slate-700 dark:text-slate-300 font-semibold">Total Labor Hours</TableHead>
                      <TableHead className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Total Revenue</TableHead>
                      <TableHead className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Total Costs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamProfitabilityData
                      .sort((a, b) => b.averageProfitMargin - a.averageProfitMargin)
                      .map(team => {
                        const profitMargin = team.averageProfitMargin;
                        const isHighProfit = profitMargin >= 20;
                        const isMediumProfit = profitMargin >= 10 && profitMargin < 20;
                        const isLowProfit = profitMargin < 10;

                        return (
                          <TableRow key={team.teamId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                            <TableCell className="font-medium text-slate-900 dark:text-white p-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#3B9FF3] dark:text-blue-400" />
                                {team.teamName}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300 p-4">{team.location || '-'}</TableCell>
                            <TableCell className="text-center p-4">
                              <Badge className="badge-soft-blue">
                                {team.totalProjects}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center p-4">
                              <Badge className={
                                isHighProfit ? 'badge-soft-green' :
                                isMediumProfit ? 'badge-soft-amber' :
                                'badge-soft-red'
                              }>
                                {profitMargin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-slate-900 dark:text-white p-4">
                              {team.totalLaborHours.toFixed(1)}h
                            </TableCell>
                            <TableCell className="text-right font-bold text-[#3B9FF3] dark:text-blue-400 p-4">
                              ${team.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-slate-700 dark:text-slate-300 p-4">
                              ${team.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Team Performance Comparison */}
        {teamPerformance.length > 0 && (
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700 mb-8">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                Team Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
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
                    formatter={(value, name) => {
                      if (name === 'Efficiency %') return [`${value.toFixed(1)}%`, 'Efficiency'];
                      if (name === 'Completed Jobs') return [value, 'Jobs'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="efficiency" fill="#3B9FF3" name="Efficiency %" />
                  <Bar dataKey="jobs" fill="#10b981" name="Completed Jobs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topPerformers} layout="vertical">
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
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Efficiency']}
                  />
                  <Bar dataKey="efficiency" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom Performers */}
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={bottomPerformers} layout="vertical">
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
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Efficiency']}
                  />
                  <Bar dataKey="efficiency" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Job List */}
        <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white">All Jobs Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left p-4 text-slate-700 dark:text-slate-300 font-semibold">Job Name</th>
                    <th className="text-left p-4 text-slate-700 dark:text-slate-300 font-semibold">Team</th>
                    <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Est. Hours</th>
                    <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Actual Hours</th>
                    <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Difference</th>
                    <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Efficiency</th>
                    <th className="text-right p-4 text-slate-700 dark:text-slate-300 font-semibold">Labor Cost</th>
                    <th className="text-center p-4 text-slate-700 dark:text-slate-300 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => (
                    <tr key={job.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <Link
                          to={createPageUrl(`JobDetails?id=${job.id}`)}
                          className="text-[#3B9FF3] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          {job.name}
                        </Link>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300">{teams?.find(t => t.id === job.team_id)?.team_name || '-'}</td>
                      <td className="p-4 text-right text-slate-700 dark:text-slate-300">{job.estimatedHours.toFixed(1)}h</td>
                      <td className="p-4 text-right text-slate-700 dark:text-slate-300">{job.actualHours.toFixed(1)}h</td>
                      <td className="p-4 text-right">
                        <span className={job.hoursDifference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {job.hoursDifference >= 0 ? '+' : ''}{job.hoursDifference.toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Badge className={
                          job.efficiency >= 120 ? 'badge-soft-green' :
                          job.efficiency >= 100 ? 'badge-soft-blue' :
                          job.efficiency >= 80 ? 'badge-soft-amber' :
                          'badge-soft-red'
                        }>
                          {job.efficiency.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-4 text-right text-slate-700 dark:text-slate-300">
                        ${job.laborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={
                          job.status === 'completed'
                            ? 'badge-soft-blue'
                            : 'badge-soft-green'
                        }>
                          {job.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredJobs.length === 0 && (
              <div className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No Performance Data</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Jobs need approved quotes with estimated hours and logged time entries to show performance data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}