import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hammer, Users, CheckSquare, AlertCircle, MapPin, Calendar, TrendingUp } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ForemanDashboard() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Fetch jobs where user is the lead
  const { data: myJobs = [] } = useQuery({
    queryKey: ['foremanJobs'],
    queryFn: () => base44.entities.Job.filter({ lead_id: user?.id }),
    enabled: !!user?.id,
    initialData: []
  });

  // Fetch assignments for my jobs
  const { data: assignments = [] } = useQuery({
    queryKey: ['foremanAssignments'],
    queryFn: async () => {
      if (myJobs.length === 0) return [];
      const jobIds = myJobs.map(j => j.id);
      const allAssignments = await base44.entities.JobAssignment.list('-date', 200);
      return allAssignments.filter(a => jobIds.includes(a.job_id));
    },
    enabled: myJobs.length > 0,
    initialData: []
  });

  // Fetch time entries for my jobs
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['foremanTimeEntries'],
    queryFn: async () => {
      if (myJobs.length === 0) return [];
      const jobIds = myJobs.map(j => j.id);
      const allEntries = await base44.entities.TimeEntry.list('-date', 200);
      return allEntries.filter(t => jobIds.includes(t.job_id));
    },
    enabled: myJobs.length > 0,
    initialData: []
  });

  // Fetch team members assigned to my jobs
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['foremanTeam'],
    queryFn: async () => {
      const uniqueEmails = [...new Set(assignments.map(a => a.employee_email))];
      if (uniqueEmails.length === 0) return [];
      const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
      return directory.filter(d => uniqueEmails.includes(d.employee_email));
    },
    enabled: assignments.length > 0,
    initialData: []
  });

  const stats = useMemo(() => {
    const todayAssignments = assignments.filter(a => {
      const assignmentDate = new Date(a.date);
      const today = new Date();
      return assignmentDate.toDateString() === today.toDateString();
    });

    const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);

    return {
      activeJobs: myJobs.filter(j => j.status === 'active').length,
      todayAssignments: todayAssignments.length,
      teamSize: teamMembers.length,
      totalHoursThisWeek: totalHours
    };
  }, [myJobs, assignments, teamMembers, timeEntries]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-md">
              <Hammer className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Panel de Foreman' : 'Foreman Dashboard'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {language === 'es' ? 'Gestiona tus sitios de trabajo' : 'Manage your job sites'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm">{language === 'es' ? 'Trabajos Activos' : 'Active Jobs'}</p>
                <Hammer className="w-5 h-5 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{stats.activeJobs}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-sm">{language === 'es' ? 'Asignaciones Hoy' : 'Today\'s Assignments'}</p>
                <Calendar className="w-5 h-5 text-blue-100" />
              </div>
              <p className="text-3xl font-bold">{stats.todayAssignments}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm">{language === 'es' ? 'Miembros' : 'Team Members'}</p>
                <Users className="w-5 h-5 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">{stats.teamSize}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyan-100 text-sm">{language === 'es' ? 'Horas Semana' : 'Hours This Week'}</p>
                <TrendingUp className="w-5 h-5 text-cyan-100" />
              </div>
              <p className="text-3xl font-bold">{stats.totalHoursThisWeek.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to={createPageUrl('Calendario')}>
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  {language === 'es' ? 'Ver Calendario' : 'View Schedule'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Asignaciones y horarios' : 'Assignments and schedules'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Trabajos')}>
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Hammer className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  {language === 'es' ? 'Mis Trabajos' : 'My Jobs'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Gestionar sitios de trabajo' : 'Manage job sites'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Directory')}>
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  {language === 'es' ? 'Mi Equipo' : 'My Team'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Ver directorio de equipo' : 'View team directory'}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Jobs */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              {language === 'es' ? 'Sitios de Trabajo Activos' : 'Active Job Sites'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myJobs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                {language === 'es' ? 'No hay trabajos asignados como foreman' : 'No jobs assigned as foreman'}
              </p>
            ) : (
              <div className="space-y-4">
                {myJobs.filter(j => j.status === 'active').map(job => (
                  <div key={job.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{job.name}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{job.address}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 flex-shrink-0">
                        {job.status}
                      </Badge>
                    </div>
                    
                    {job.customer_name && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                        <Users className="w-3 h-3" />
                        <span>{job.customer_name}</span>
                      </div>
                    )}
                    
                    <Link to={createPageUrl('JobDetails') + `?id=${job.id}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        {language === 'es' ? 'Ver Detalles' : 'View Details'}
                      </Button>
                    </Link>
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