import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function PersonalTimeView({ entries, jobs }) {
  const { language } = useLanguage();

  const groupedByJob = entries.reduce((acc, entry) => {
    const jobId = entry.job_id || 'no-job';
    if (!acc[jobId]) {
      acc[jobId] = {
        job: jobs.find(j => j.id === entry.job_id),
        entries: [],
        totalHours: 0
      };
    }
    acc[jobId].entries.push(entry);
    acc[jobId].totalHours += entry.hours_worked || 0;
    return acc;
  }, {});

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  return (
    <div className="space-y-6">
      {Object.values(groupedByJob).map((group, idx) => (
        <Card key={idx} className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-slate-900 dark:text-white">
                    {group.job?.name || (language === 'es' ? 'Sin Trabajo Asignado' : 'No Job Assigned')}
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {group.entries.length} {language === 'es' ? 'registros' : 'entries'} • {group.totalHours.toFixed(1)} {language === 'es' ? 'horas' : 'hours'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {group.entries.map(entry => (
                <div key={entry.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <Badge className={statusColors[entry.status] || statusColors.pending}>
                      {entry.status === 'pending' ? (language === 'es' ? 'Pendiente' : 'Pending') :
                       entry.status === 'approved' ? (language === 'es' ? 'Aprobado' : 'Approved') :
                       (language === 'es' ? 'Rechazado' : 'Rejected')}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Entrada' : 'Check In'}:</span>
                      <p className="font-medium text-slate-900 dark:text-white">{entry.check_in?.substring(0, 5)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Salida' : 'Check Out'}:</span>
                      <p className="font-medium text-slate-900 dark:text-white">{entry.check_out?.substring(0, 5)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Horas' : 'Hours'}:</span>
                      <p className="font-bold text-blue-600 dark:text-blue-400">{entry.hours_worked?.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">{language === 'es' ? 'Tipo' : 'Type'}:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {entry.hour_type === 'overtime' ? (language === 'es' ? 'Extra' : 'OT') : (language === 'es' ? 'Normal' : 'Reg')}
                      </p>
                    </div>
                  </div>

                  {entry.task_details && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      <strong>{language === 'es' ? 'Tarea:' : 'Task:'}</strong> {entry.task_details}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <strong>{language === 'es' ? 'Notas:' : 'Notes:'}</strong> {entry.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {entries.length === 0 && (
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {language === 'es' ? 'No hay registros de tiempo' : 'No time entries found'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}