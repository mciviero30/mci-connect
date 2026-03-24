import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Coffee, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { buildUserQuery } from "@/components/utils/userResolution";

export default function DailyTimeView({ user, selectedDate, onDateChange }) {
  const { language } = useLanguage();

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dailyTimeEntries', user?.id, user?.email, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return await base44.entities.TimeEntry.filter({
        ...query,
        date: format(selectedDate, 'yyyy-MM-dd')
      });
    },
    enabled: !!user,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const workTypeColors = {
    normal: 'bg-blue-100 text-blue-800',
    driving: 'bg-purple-100 text-purple-800',
    setup: 'bg-orange-100 text-orange-800',
    cleanup: 'bg-slate-100 text-slate-800'
  };

  const hourTypeColors = {
    normal: 'bg-green-100 text-green-800',
    overtime: 'bg-red-100 text-red-800'
  };

  const getWorkTypeLabel = (workType) => {
    const labels = {
      normal: language === 'es' ? 'Trabajo Normal' : 'Normal Work',
      driving: language === 'es' ? 'Manejo' : 'Driving',
      setup: language === 'es' ? 'Preparación' : 'Setup',
      cleanup: language === 'es' ? 'Limpieza' : 'Cleanup'
    };
    return labels[workType] || workType;
  };

  const getHourTypeLabel = (hourType) => {
    const labels = {
      normal: language === 'es' ? 'Normal' : 'Normal',
      overtime: language === 'es' ? 'Tiempo Extra' : 'Overtime'
    };
    return labels[hourType] || hourType;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === 'es' ? 'Vista Diaria' : 'Daily View'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              {format(selectedDate, 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
            >
              {language === 'es' ? 'Hoy' : 'Today'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {language === 'es' ? 'No hay registros para este día' : 'No entries for this day'}
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                {/* Header: Time & Job */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">
                        {entry.check_in} - {entry.check_out || (language === 'es' ? 'En curso' : 'In progress')}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {entry.job_name || (language === 'es' ? 'Sin trabajo asignado' : 'No job assigned')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-2xl font-bold text-blue-600">
                      {entry.hours_worked?.toFixed(2) || '0.00'}h
                    </p>
                    <Badge className={statusColors[entry.status]} variant="secondary">
                      {language === 'es' 
                        ? (entry.status === 'pending' ? 'Pendiente' : entry.status === 'approved' ? 'Aprobado' : 'Rechazado')
                        : entry.status
                      }
                    </Badge>
                  </div>
                </div>

                {/* Work Type & Hour Type Badges - CRITICAL FOR ACCOUNTING */}
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Badge className={workTypeColors[entry.work_type] || 'bg-slate-100 text-slate-800'}>
                    {getWorkTypeLabel(entry.work_type || 'normal')}
                  </Badge>
                  <Badge className={hourTypeColors[entry.hour_type] || 'bg-green-100 text-green-800'}>
                    {getHourTypeLabel(entry.hour_type || 'normal')}
                  </Badge>
                  {entry.exceeds_max_hours && (
                    <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {language === 'es' ? 'Excede 14h' : 'Exceeds 14h'}
                    </Badge>
                  )}
                </div>

                {/* Task Details */}
                {entry.task_details && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      {language === 'es' ? 'Detalles de Tarea' : 'Task Details'}
                    </p>
                    <p className="text-sm text-slate-700">{entry.task_details}</p>
                  </div>
                )}

                {/* Breaks */}
                {entry.breaks?.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-slate-900">
                      <Coffee className="w-4 h-4" />
                      {language === 'es' ? 'Pausas' : 'Breaks'} ({entry.total_break_minutes || 0} {language === 'es' ? 'min' : 'min'})
                    </p>
                    <div className="space-y-1">
                      {entry.breaks.map((brk, idx) => (
                        <div key={idx} className="text-sm text-slate-600 flex justify-between bg-slate-50 px-2 py-1 rounded">
                          <span className="font-medium">
                            {brk.type === 'lunch' ? (language === 'es' ? 'Almuerzo' : 'Lunch') : (language === 'es' ? 'Descanso' : 'Break')}
                          </span>
                          <span>{brk.start_time} - {brk.end_time || (language === 'es' ? 'En curso' : 'Active')}</span>
                          <span className="font-semibold">{brk.duration_minutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geofence Warning */}
                {entry.requires_location_review && (
                  <div className="border-t pt-3 bg-amber-50 px-3 py-2 rounded">
                    <p className="text-xs text-amber-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {language === 'es' ? 'Requiere revisión de ubicación' : 'Requires location review'}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      {language === 'es' ? 'Notas' : 'Notes'}
                    </p>
                    <p className="text-sm text-slate-700">{entry.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}