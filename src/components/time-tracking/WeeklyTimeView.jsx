import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { buildUserQuery } from "@/components/utils/userResolution";

export default function WeeklyTimeView({ user, selectedDate, onDateChange }) {
  const { language } = useLanguage();

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['weeklyTimeEntries', user?.id, user?.email, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return await base44.entities.TimeEntry.filter({
        ...query,
        date: { $gte: format(weekStart, 'yyyy-MM-dd'), $lte: format(weekEnd, 'yyyy-MM-dd') }
      });
    },
    enabled: !!user,
  });

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getDayEntries = (day) => {
    return entries.filter(e => e.date === format(day, 'yyyy-MM-dd'));
  };

  const getDayTotal = (day) => {
    const dayEntries = getDayEntries(day);
    return dayEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  };

  const weekTotal = entries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === 'es' ? 'Vista Semanal' : 'Weekly View'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(subWeeks(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(addWeeks(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
            >
              {language === 'es' ? 'Esta Semana' : 'This Week'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Weekly Total */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Total Semanal' : 'Weekly Total'}
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {weekTotal.toFixed(2)}h
                </span>
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => {
                const dayTotal = getDayTotal(day);
                const dayEntries = getDayEntries(day);
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                return (
                  <div
                    key={day.toString()}
                    className={`border rounded-lg p-3 ${
                      isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {format(day, 'EEE')}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {format(day, 'd')}
                    </p>
                    {dayTotal > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-blue-600">
                          {dayTotal.toFixed(1)}h
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dayEntries.map((entry) => (
                            <Badge
                              key={entry.id}
                              variant={entry.status === 'approved' ? 'default' : 'secondary'}
                              className="text-xs px-1"
                            >
                              {entry.status === 'approved' ? '✓' : '○'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed List */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                {language === 'es' ? 'Detalles de Registros' : 'Entry Details'}
              </h4>
              {entries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  {language === 'es' ? 'No hay registros esta semana' : 'No entries this week'}
                </p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{format(new Date(entry.date), 'EEE, MMM d')}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {entry.check_in} - {entry.check_out || 'En curso'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{entry.hours_worked?.toFixed(2) || '0.00'}h</p>
                      <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                        {entry.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}