import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../components/shared/PageHeader";
import { Briefcase, Clock, Calendar, TrendingUp, Target, Folder } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { buildUserQuery } from "@/components/utils/userResolution";
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { hasFullAccess } from "@/components/core/roleRules";

export default function MisProyectos() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  const { data: assignments = [] } = useQuery({
    queryKey: ['myAssignments', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.JobAssignment.filter(query, '-date');
    },
    enabled: !!user,
    initialData: []
  });

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.TimeEntry.filter(query, '-date', 100);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const myJobs = useMemo(() => {
    const jobIds = [...new Set(assignments.map(a => a.job_id))];
    
    return jobIds.map(jobId => {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return null;
      
      const jobAssignments = assignments.filter(a => a.job_id === jobId);
      const jobTimeEntries = timeEntries.filter(t => t.job_id === jobId);
      
      const totalHours = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const estimatedHours = job.estimated_hours || 100;
      const progress = estimatedHours > 0 ? ((totalHours / estimatedHours) * 100) : 0;
      
      // Predict completion
      const avgHoursPerDay = totalHours > 0 ? totalHours / 30 : 4;
      const remainingHours = Math.max(0, estimatedHours - totalHours);
      const daysRemaining = avgHoursPerDay > 0 ? Math.ceil(remainingHours / avgHoursPerDay) : 0;
      const predictedCompletion = addDays(new Date(), daysRemaining);
      
      return {
        ...job,
        totalHours,
        estimatedHours,
        progress: Math.min(progress, 100),
        daysRemaining,
        predictedCompletion,
        assignmentCount: jobAssignments.length
      };
    }).filter(Boolean).sort((a, b) => a.progress - b.progress);
  }, [assignments, timeEntries, jobs]);

  const totalHoursAllJobs = myJobs.reduce((sum, j) => sum + j.totalHours, 0);
  const avgProgress = myJobs.length > 0 ? myJobs.reduce((sum, j) => sum + j.progress, 0) / myJobs.length : 0;

  // Check if user can see metrics (admin, CEO, manager, supervisor)
  const canSeeMetrics = hasFullAccess(user) || user?.role === 'manager' || user?.position === 'Supervisor';

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? "Mis Proyectos" : "My Jobs"}
          description={language === 'es' ? "Tus trabajos asignados y progreso" : "Your assigned jobs and progress"}
          icon={Briefcase}
        />

        {/* Summary Cards - Simplified for Employees */}
        {canSeeMetrics ? (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-100 text-sm">{language === 'es' ? 'Proyectos Activos' : 'Active Jobs'}</p>
                  <Briefcase className="w-5 h-5 text-blue-100" />
                </div>
                <p className="text-3xl font-bold">{myJobs.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 text-sm">{language === 'es' ? 'Horas Totales' : 'Total Hours'}</p>
                  <Clock className="w-5 h-5 text-green-100" />
                </div>
                <p className="text-3xl font-bold">{totalHoursAllJobs.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-purple-100 text-sm">{language === 'es' ? 'Progreso Promedio' : 'Avg Progress'}</p>
                  <TrendingUp className="w-5 h-5 text-purple-100" />
                </div>
                <p className="text-3xl font-bold">{avgProgress.toFixed(0)}%</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">{language === 'es' ? 'Proyectos Activos' : 'Active Jobs'}</p>
                  <p className="text-3xl font-bold">{myJobs.length}</p>
                </div>
                <Briefcase className="w-12 h-12 text-blue-100 opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Cards */}
        <div className="space-y-6">
          {myJobs.length === 0 ? (
            <Card className="bg-white/90 shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <Folder className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <p className="text-slate-600">{language === 'es' ? 'No tienes proyectos asignados' : 'No jobs assigned'}</p>
              </CardContent>
            </Card>
          ) : (
            myJobs.map(job => (
              <Card key={job.id} className="bg-white/90 shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader>
                 <div className="flex items-start justify-between gap-3">
                   <div className="flex-1 min-w-0">
                     <CardTitle className="text-slate-900 truncate" title={job.name}>{job.name}</CardTitle>
                     <p className="text-sm text-slate-600 mt-1 truncate" title={job.address}>{job.address}</p>
                   </div>
                   <div className="flex-shrink-0">
                     <Badge className={`${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                       {job.status}
                     </Badge>
                   </div>
                 </div>
                </CardHeader>
                <CardContent>
                  {/* ADMIN/MANAGER/SUPERVISOR: Full metrics */}
                  {canSeeMetrics ? (
                    <>
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">{language === 'es' ? 'Horas Trabajadas' : 'Hours Worked'}</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{job.totalHours.toFixed(0)}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">/ {job.estimatedHours} {language === 'es' ? 'estimadas' : 'estimated'}</p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-700 dark:text-green-300 mb-1">{language === 'es' ? 'Progreso' : 'Progress'}</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{job.progress.toFixed(0)}%</p>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs text-purple-700 dark:text-purple-300 mb-1">{language === 'es' ? 'Finalización Estimada' : 'Est. Completion'}</p>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {job.daysRemaining} {language === 'es' ? 'días' : 'days'}
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            {format(job.predictedCompletion, 'MMM dd', { locale: language === 'es' ? es : undefined })}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                          <span>{language === 'es' ? 'Progreso' : 'Progress'}</span>
                          <span>{job.progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={job.progress} className="h-3" />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{job.assignmentCount} {language === 'es' ? 'asignaciones' : 'assignments'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>{language === 'es' ? 'Estimado' : 'Estimated'}: {job.estimatedHours}h</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* EMPLOYEE: Basic job info only */
                    <div className="space-y-3">
                      {job.customer_name && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{language === 'es' ? 'Cliente' : 'Customer'}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{job.customer_name}</p>
                        </div>
                      )}
                      
                      {job.lead_name && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{language === 'es' ? 'Supervisor/Foreman' : 'Supervisor/Foreman'}</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{job.lead_name}</p>
                          {job.lead_phone && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">{job.lead_phone}</p>
                          )}
                        </div>
                      )}
                      
                      {job.description && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{language === 'es' ? 'Detalles' : 'Details'}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{job.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}