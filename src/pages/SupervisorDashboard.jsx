import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, AlertTriangle, CheckCircle, Briefcase, Calendar, TrendingUp } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

export default function SupervisorDashboard() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Fetch all time entries for approval
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending' }, '-date', 100),
    enabled: !!user,
    initialData: []
  });

  // Fetch all expenses for approval
  const { data: expenses = [] } = useQuery({
    queryKey: ['allExpenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'pending' }, '-date', 100),
    enabled: !!user,
    initialData: []
  });

  // Fetch jobs assigned to supervisor
  const { data: jobs = [] } = useQuery({
    queryKey: ['supervisorJobs'],
    queryFn: () => base44.entities.Job.filter({ lead_id: user?.id }),
    enabled: !!user?.id,
    initialData: []
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamDirectory'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }),
    enabled: !!user,
    initialData: []
  });

  const stats = useMemo(() => {
    const pendingHours = timeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const pendingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return {
      pendingTimeEntries: timeEntries.length,
      pendingExpenses: expenses.length,
      totalPendingHours: pendingHours,
      totalPendingExpenseAmount: pendingExpenses,
      activeJobs: jobs.length,
      teamSize: teamMembers.length
    };
  }, [timeEntries, expenses, jobs, teamMembers]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Panel de Supervisor' : 'Supervisor Dashboard'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {language === 'es' ? 'Gestiona tu equipo y aprobaciones' : 'Manage your team and approvals'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-sm">{language === 'es' ? 'Horas Pendientes' : 'Pending Hours'}</p>
                <Clock className="w-5 h-5 text-blue-100" />
              </div>
              <p className="text-3xl font-bold">{stats.pendingTimeEntries}</p>
              <p className="text-xs text-blue-100 mt-1">{stats.totalPendingHours.toFixed(1)} {language === 'es' ? 'horas' : 'hours'}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-amber-100 text-sm">{language === 'es' ? 'Gastos Pendientes' : 'Pending Expenses'}</p>
                <AlertTriangle className="w-5 h-5 text-amber-100" />
              </div>
              <p className="text-3xl font-bold">{stats.pendingExpenses}</p>
              <p className="text-xs text-amber-100 mt-1">${stats.totalPendingExpenseAmount.toFixed(0)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm">{language === 'es' ? 'Trabajos Activos' : 'Active Jobs'}</p>
                <Briefcase className="w-5 h-5 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{stats.activeJobs}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm">{language === 'es' ? 'Miembros del Equipo' : 'Team Members'}</p>
                <Users className="w-5 h-5 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">{stats.teamSize}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Aprobar Horas' : 'Approve Hours'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {stats.pendingTimeEntries} {language === 'es' ? 'entradas pendientes de aprobación' : 'pending time entries to approve'}
              </p>
              <Link to={createPageUrl('Horarios')}>
                <Button className="w-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white">
                  {language === 'es' ? 'Revisar Horas' : 'Review Hours'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                {language === 'es' ? 'Aprobar Gastos' : 'Approve Expenses'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {stats.pendingExpenses} {language === 'es' ? 'gastos pendientes de aprobación' : 'pending expenses to approve'}
              </p>
              <Link to={createPageUrl('Gastos')}>
                <Button className="w-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white">
                  {language === 'es' ? 'Revisar Gastos' : 'Review Expenses'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Overview */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                {language === 'es' ? 'Mis Trabajos' : 'My Jobs'}
              </div>
              <Link to={createPageUrl('Trabajos')}>
                <Button variant="outline" size="sm">
                  {language === 'es' ? 'Ver Todos' : 'View All'}
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                {language === 'es' ? 'No hay trabajos asignados' : 'No jobs assigned'}
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{job.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{job.address}</p>
                    </div>
                    <Badge className={job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}