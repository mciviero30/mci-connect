import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../components/shared/PageHeader";
import { Briefcase, Clock, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MisProyectos() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list(),
    initialData: []
  });

  const myJobs = useMemo(() => {
    if (!user) return [];

    const myTimeEntries = timeEntries.filter(t => t.employee_email === user.email);
    const myJobIds = [...new Set(myTimeEntries.map(t => t.job_id))];
    const myAssignedJobs = assignments.filter(a => a.employee_email === user.email).map(a => a.job_id);
    const allMyJobIds = [...new Set([...myJobIds, ...myAssignedJobs])];

    return jobs
      .filter(j => allMyJobIds.includes(j.id) && j.status !== 'archived')
      .map(job => {
        const jobTimeEntries = myTimeEntries.filter(t => t.job_id === job.id);
        const totalHoursWorked = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);

        // Get all time entries for this job (not just mine) to calculate total
        const allJobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
        const totalJobHours = allJobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);

        // Predict completion
        const estimatedHours = job.estimated_hours || 100;
        const completionPercentage = estimatedHours > 0 ? (totalJobHours / estimatedHours * 100) : 0;
        const remainingHours = Math.max(0, estimatedHours - totalJobHours);
        
        const avgHoursPerDay = totalJobHours > 0 ? totalJobHours / 30 : 8;
        const daysRemaining = avgHoursPerDay > 0 ? Math.ceil(remainingHours / avgHoursPerDay) : 0;
        const predictedCompletionDate = addDays(new Date(), daysRemaining);

        // Get upcoming assignments
        const myUpcomingAssignments = assignments.filter(a => 
          a.employee_email === user.email && 
          a.job_id === job.id &&
          new Date(a.date) >= new Date()
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
          ...job,
          myHours: totalHoursWorked,
          totalJobHours,
          completionPercentage,
          predictedCompletionDate,
          daysRemaining,
          nextAssignment: myUpcomingAssignments[0]
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [user, jobs, timeEntries, assignments]);

  const totalMyHours = useMemo(() => {
    return myJobs.reduce((sum, job) => sum + job.myHours, 0);
  }, [myJobs]);

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Mis Proyectos" : "My Projects"}
          description={language === 'es' ? "Tus proyectos activos y progreso" : "Your active projects and progress"}
          icon={Briefcase}
        />

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-sm font-medium">
                  {language === 'es' ? 'Proyectos Activos' : 'Active Projects'}
                </p>
                <Briefcase className="w-5 h-5 text-blue-100" />
              </div>
              <p className="text-3xl font-bold">{myJobs.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-medium">
                  {language === 'es' ? 'Mis Horas' : 'My Hours'}
                </p>
                <Clock className="w-5 h-5 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{totalMyHours.toFixed(0)}h</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm font-medium">
                  {language === 'es' ? 'Próximas Citas' : 'Upcoming Assignments'}
                </p>
                <Calendar className="w-5 h-5 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">
                {myJobs.filter(j => j.nextAssignment).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* MY PROJECTS */}
        <div className="space-y-6">
          {myJobs.map(job => (
            <Card key={job.id} className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{job.name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{job.address || job.city}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {language === 'es' ? 'Mis Horas' : 'My Hours'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm text-slate-700">{language === 'es' ? 'Trabajadas' : 'Worked'}</span>
                        <span className="font-bold text-blue-600">{job.myHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <span className="text-sm text-slate-700">{language === 'es' ? 'Total Proyecto' : 'Total Project'}</span>
                        <span className="font-bold text-slate-600">{job.totalJobHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      {language === 'es' ? 'Predicción' : 'Prediction'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                        <span className="text-sm text-slate-700">{language === 'es' ? 'Completado' : 'Completed'}</span>
                        <span className="font-bold text-purple-600">{Math.min(job.completionPercentage, 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm text-slate-700">{language === 'es' ? 'Finaliza en' : 'Completes in'}</span>
                        <span className="font-bold text-green-600">
                          {job.daysRemaining} {language === 'es' ? 'días' : 'days'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>{language === 'es' ? 'Progreso' : 'Progress'}</span>
                    <span>{Math.min(job.completionPercentage, 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${Math.min(job.completionPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {job.nextAssignment && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h5 className="font-semibold text-slate-900">
                        {language === 'es' ? 'Próxima Asignación' : 'Next Assignment'}
                      </h5>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-700">
                          {format(new Date(job.nextAssignment.date), 'EEEE, MMMM dd', { locale: language === 'es' ? es : undefined })}
                        </p>
                        {job.nextAssignment.start_time && (
                          <p className="text-xs text-slate-600">
                            {job.nextAssignment.start_time} - {job.nextAssignment.end_time || 'TBD'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600">
                          {language === 'es' ? 'En' : 'In'} {differenceInDays(new Date(job.nextAssignment.date), new Date())} {language === 'es' ? 'días' : 'days'}
                        </p>
                      </div>
                    </div>
                    {job.nextAssignment.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">
                        {job.nextAssignment.notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {myJobs.length === 0 && (
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'es' ? 'No tienes proyectos asignados' : 'No projects assigned'}
                </h3>
                <p className="text-slate-600">
                  {language === 'es' 
                    ? 'Tus proyectos aparecerán aquí cuando sean asignados'
                    : 'Your projects will appear here when assigned'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}