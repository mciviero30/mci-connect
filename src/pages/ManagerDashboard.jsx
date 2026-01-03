import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, DollarSign, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';

export default function ManagerDashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { profile: userProfile } = useEmployeeProfile(currentUser?.email, currentUser);
  const isManager = userProfile?.role === 'manager';

  // Fetch manager's teams
  const { data: managerTeams = [] } = useQuery({
    queryKey: ['manager-teams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return base44.entities.Team.filter({ manager_email: currentUser.email });
    },
    enabled: !!currentUser?.email && isManager,
  });

  // Fetch jobs for manager's teams
  const { data: jobs = [] } = useQuery({
    queryKey: ['manager-jobs', managerTeams.map(t => t.id).join(',')],
    queryFn: async () => {
      if (managerTeams.length === 0) return [];
      const allJobs = [];
      for (const team of managerTeams) {
        const teamJobs = await base44.entities.Job.filter({ team_id: team.id });
        allJobs.push(...teamJobs);
      }
      return allJobs;
    },
    enabled: managerTeams.length > 0,
  });

  // Fetch manager's commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ['manager-commissions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return base44.entities.CommissionResult.filter({ 
        employee_email: currentUser.email 
      });
    },
    enabled: !!currentUser?.email && isManager,
  });

  // Filter by date
  const filterByDate = (items, dateField) => {
    let filtered = items;
    if (startDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate <= new Date(endDate);
      });
    }
    return filtered;
  };

  // Calculate metrics
  const filteredJobs = filterByDate(jobs, 'completed_date');
  const completedJobs = filteredJobs.filter(j => j.status === 'completed');

  const filteredCommissions = filterByDate(commissions, 'created_date');
  const approvedCommissions = filteredCommissions.filter(c => c.status === 'approved');
  const paidCommissions = filteredCommissions.filter(c => c.status === 'paid');

  const totalApproved = approvedCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const totalPaid = paidCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <Card className="max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xl">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              This dashboard is only available for Managers. Please contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header - Enhanced */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Manager Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Your performance overview and team insights</p>
        </div>

        {/* Date Filter - Enhanced */}
        <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
              Period Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-medium mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-medium mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Closed - Enhanced */}
        <Card className="soft-blue-gradient shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-blue-700 dark:text-blue-600 text-xl">
              <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Briefcase className="w-6 h-6" />
              </div>
              Jobs Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-blue-800 dark:text-blue-700 mb-2">
              {completedJobs.length}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-600 font-medium">
              Completed job{completedJobs.length !== 1 ? 's' : ''} in selected period
            </p>
          </CardContent>
        </Card>

        {/* Commissions - Enhanced cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="soft-amber-gradient shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-amber-700 dark:text-amber-600 text-lg">
                <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                Approved - Awaiting Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-amber-800 dark:text-amber-700 mb-2">
                ${totalApproved.toLocaleString()}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-600 font-medium">
                {approvedCommissions.length} commission{approvedCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="soft-green-gradient shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-green-700 dark:text-green-600 text-lg">
                <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-800 dark:text-green-700 mb-2">
                ${totalPaid.toLocaleString()}
              </p>
              <p className="text-sm text-green-700 dark:text-green-600 font-medium">
                {paidCommissions.length} commission{paidCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Teams Overview - Enhanced */}
        {managerTeams.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                Your Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {managerTeams.map(team => {
                  const teamJobCount = jobs.filter(j => j.team_id === team.id).length;
                  const teamActiveJobs = jobs.filter(j => j.team_id === team.id && j.status === 'active').length;
                  
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#507DB4]/20 to-[#6B9DD8]/20 rounded-lg">
                          <MapPin className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{team.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {teamJobCount} total job{teamJobCount !== 1 ? 's' : ''} • {teamActiveJobs} active
                          </p>
                        </div>
                      </div>
                      <Badge className="soft-blue-gradient px-3 py-1 text-xs font-bold">
                        {teamActiveJobs} Active
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}