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
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              This dashboard is only available for Managers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Manager Dashboard</h1>
          <p className="text-slate-600">Your performance overview</p>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Period Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Closed */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Briefcase className="w-6 h-6" />
              Jobs Closed
              <div className="ml-auto">
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs cursor-help">
                    ?
                  </div>
                  <div className="absolute right-0 top-6 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                    Number of completed jobs assigned to your teams in the selected period
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-700">
              {completedJobs.length}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Completed job{completedJobs.length !== 1 ? 's' : ''} in selected period
            </p>
          </CardContent>
        </Card>

        {/* Commissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <TrendingUp className="w-5 h-5" />
                Approved - Awaiting Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">
                ${totalApproved.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {approvedCommissions.length} commission{approvedCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                ${totalPaid.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {paidCommissions.length} commission{paidCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Teams Overview */}
        {managerTeams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {managerTeams.map(team => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 bg-slate-100 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-600">
                        {jobs.filter(j => j.team_id === team.id).length} job{jobs.filter(j => j.team_id === team.id).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}