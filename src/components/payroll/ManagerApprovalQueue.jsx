import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, User, AlertTriangle, Send } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

export default function ManagerApprovalQueue({ managerId }) {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  const weekStart = format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch team members for this manager
  const { data: team = [] } = useQuery({
    queryKey: ['team-members', managerId],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ manager_email: managerId });
      if (teams.length === 0) return [];
      
      const allMembers = [];
      for (const team of teams) {
        const members = await base44.entities.User.filter({ team_id: team.id });
        allMembers.push(...members);
      }
      return allMembers;
    },
    enabled: !!managerId
  });

  // Fetch time entries for team
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['team-time-entries', weekStart],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({ status: 'pending' });
      return entries.filter(e => {
        if (!e.date) return false;
        return e.date >= weekStart && e.date <= weekEnd;
      });
    },
    enabled: team.length > 0
  });

  // Fetch driving logs
  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['team-driving-logs', weekStart],
    queryFn: async () => {
      const logs = await base44.entities.DrivingLog.filter({ status: 'pending' });
      return logs.filter(e => {
        if (!e.date) return false;
        return e.date >= weekStart && e.date <= weekEnd;
      });
    },
    enabled: team.length > 0
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['team-expenses', weekStart],
    queryFn: async () => {
      const exps = await base44.entities.Expense.filter({ status: 'pending' });
      return exps.filter(e => {
        if (!e.date) return false;
        return e.date >= weekStart && e.date <= weekEnd;
      });
    },
    enabled: team.length > 0
  });

  // Group by employee
  const employeeTimesheets = useMemo(() => {
    const teamEmails = team.map(m => m.email);
    
    return teamEmails.map(email => {
      const employee = team.find(e => e.email === email);
      const empTimeEntries = timeEntries.filter(t => t.employee_email === email);
      const empDriving = drivingLogs.filter(d => d.employee_email === email);
      const empExpenses = expenses.filter(e => e.employee_email === email);

      const totalHours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const totalMiles = empDriving.reduce((sum, d) => sum + (d.miles || 0), 0);
      const totalExpenses = empExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const hasData = empTimeEntries.length > 0 || empDriving.length > 0 || empExpenses.length > 0;

      return {
        employee,
        timeEntries: empTimeEntries,
        drivingLogs: empDriving,
        expenses: empExpenses,
        totalHours,
        totalMiles,
        totalExpenses,
        hasData
      };
    }).filter(ts => ts.hasData);
  }, [team, timeEntries, drivingLogs, expenses]);

  const approveAllMutation = useMutation({
    mutationFn: async (employeeEmail) => {
      const empTimeEntries = timeEntries.filter(t => t.employee_email === employeeEmail);
      const empDriving = drivingLogs.filter(d => d.employee_email === employeeEmail);
      const empExpenses = expenses.filter(e => e.employee_email === employeeEmail);

      // Approve all in parallel
      await Promise.all([
        ...empTimeEntries.map(t => base44.entities.TimeEntry.update(t.id, { status: 'approved' })),
        ...empDriving.map(d => base44.entities.DrivingLog.update(d.id, { status: 'approved' })),
        ...empExpenses.map(e => base44.entities.Expense.update(e.id, { status: 'approved' }))
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['team-driving-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-expenses'] });
      toast.success('✅ Timesheet approved and sent to payroll');
    }
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Manager Approval Queue"
        description="Review and approve team timesheets"
        icon={CheckCircle2}
      />

      {/* Week Selector */}
      <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <input
              type="week"
              value={format(selectedWeek, 'yyyy-\'W\'ww')}
              onChange={(e) => setSelectedWeek(new Date(e.target.value))}
              className="px-4 py-2 border border-blue-200 rounded-lg bg-white"
            />
            <Badge className="bg-blue-600 text-white">
              {weekStart} → {weekEnd}
            </Badge>
            <Badge className="bg-amber-500 text-white">
              {employeeTimesheets.length} pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Impact */}
      <div className="mb-8">
        <CashFlowForecast days={30} />
      </div>

      {/* Approval Queue */}
      <div className="space-y-4">
        {employeeTimesheets.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">All Caught Up!</h3>
              <p className="text-slate-600 dark:text-slate-400">No pending timesheets for this week</p>
            </CardContent>
          </Card>
        ) : (
          employeeTimesheets.map(ts => (
            <Card key={ts.employee.email} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                      {ts.employee.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{ts.employee.full_name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{ts.employee.position}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => approveAllMutation.mutate(ts.employee.email)}
                    disabled={approveAllMutation.isPending}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Approve & Send to Payroll
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Work Hours</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{ts.totalHours.toFixed(1)} hrs</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{ts.timeEntries.length} entries</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Mileage</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{ts.totalMiles.toFixed(0)} mi</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">{ts.drivingLogs.length} trips</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">Expenses</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">${ts.totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{ts.expenses.length} items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}