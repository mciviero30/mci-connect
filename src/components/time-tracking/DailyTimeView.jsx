import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Coffee, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function DailyTimeView({ user, selectedDate, onDateChange }) {
  const { language } = useLanguage();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dailyTimeEntries', user?.email, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      return await base44.entities.TimeEntry.filter({
        employee_email: user.email,
        date: format(selectedDate, 'yyyy-MM-dd')
      });
    },
    enabled: !!user,
    staleTime: 300000, // 5 min - daily entries stable after initial load
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
              <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{entry.check_in} - {entry.check_out || 'En curso'}</p>
                      <p className="text-sm text-slate-600">
                        {entry.job_name || (language === 'es' ? 'Sin trabajo asignado' : 'No job assigned')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{entry.hours_worked || '0.00'}h</p>
                    <Badge className={statusColors[entry.status]}>
                      {language === 'es' 
                        ? (entry.status === 'pending' ? 'Pendiente' : entry.status === 'approved' ? 'Aprobado' : 'Rechazado')
                        : entry.status
                      }
                    </Badge>
                  </div>
                </div>

                {entry.breaks?.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Coffee className="w-4 h-4" />
                      {language === 'es' ? 'Pausas' : 'Breaks'}
                    </p>
                    <div className="space-y-1">
                      {entry.breaks.map((brk, idx) => (
                        <div key={idx} className="text-sm text-slate-600 flex justify-between">
                          <span>{brk.start_time} - {brk.end_time || language === 'es' ? 'En curso' : 'Active'}</span>
                          <span>{brk.duration_minutes} {language === 'es' ? 'min' : 'min'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-slate-600">{entry.notes}</p>
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