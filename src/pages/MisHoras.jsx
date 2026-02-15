import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import LiveTimeTracker from "../components/horarios/LiveTimeTracker";
import TimeEntryList from "../components/horarios/TimeEntryList";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, isToday } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { buildUserQuery } from "@/components/utils/userResolution";
import { Button } from "@/components/ui/button";
import GPSDiagnosticPanel from "@/components/time-tracking/GPSDiagnosticPanel";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function MisHoras() {
  const { t, language } = useLanguage();
  const [editingEntry, setEditingEntry] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['myTimeEntries', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.TimeEntry.filter(query, '-date');
    },
    enabled: !!user,
    staleTime: 300000, // 5 min - data changes on approval
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const openClockAlert = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) return null;
    return timeEntries.find(entry => !entry.check_out && entry.date && !isToday(new Date(entry.date)));
  }, [timeEntries]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create({
      ...data,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'pending',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      setEditingEntry(null);
    },
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);
  const hourlyRate = parseFloat(user?.hourly_rate || 25);

  const stats = useMemo(() => {
    const currentWeekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd && entry.status === 'approved';
    });
    
    const currentWeekHours = currentWeekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const normalWeekHours = Math.min(currentWeekHours, 40);
    const overtimeWeekHours = Math.max(0, currentWeekHours - 40);
    const weekPay = (normalWeekHours * hourlyRate) + (overtimeWeekHours * hourlyRate * 1.5);

    const currentMonthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= monthStart && entryDate <= endOfMonth(today) && entry.status === 'approved';
    });
    const currentMonthHours = currentMonthEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    const ytdEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= yearStart && entry.status === 'approved';
    });
    const ytdHours = ytdEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    return { currentWeekHours, weekPay, overtimeWeekHours, currentMonthHours, ytdHours };
  }, [timeEntries, weekStart, weekEnd, monthStart, yearStart, hourlyRate, today]);

  const pageStats = [
    {
      icon: Clock,
      value: `${stats.currentWeekHours.toFixed(1)}h`,
      label: t('currentWeek'),
      subtitle: stats.overtimeWeekHours > 0 ? `+${stats.overtimeWeekHours.toFixed(1)}h OT` : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: DollarSign,
      value: `$${stats.weekPay.toFixed(0)}`,
      label: language === 'es' ? 'Pago Semanal' : 'Weekly Pay',
      subtitle: language === 'es' ? 'Esta semana' : 'This week',
      iconBg: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: Calendar,
      value: `${stats.currentMonthHours.toFixed(1)}h`,
      label: t('thisMonth'),
      subtitle: format(monthStart, 'MMM yyyy'),
      iconBg: "bg-purple-100 dark:bg-purple-900/50",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: TrendingUp,
      value: `${stats.ytdHours.toFixed(0)}h`,
      label: t('yearToDate'),
      subtitle: new Date().getFullYear().toString(),
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <EmployeePageLayout
      title={t('myHours')}
      subtitle={t('trackYourWorkHours')}
      stats={pageStats}
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            variant="outline"
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Diagnóstico GPS' : 'GPS Diagnostic'}
          </Button>
          <Link to={createPageUrl('ClockInTests')}>
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Suite de Pruebas' : 'Test Suite'}
            </Button>
          </Link>
        </div>
      }
    >
      {showDiagnostics && (
        <div className="mb-6">
          <GPSDiagnosticPanel language={language} />
        </div>
      )}

      {openClockAlert && (
        <Alert className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="font-bold text-red-900 dark:text-red-300">
            {language === 'es' ? '⚠️ Reloj Activo Detectado' : '⚠️ Active Clock Detected'}
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-400">
            {language === 'es' 
              ? `Tienes un reloj activo del día ${format(new Date(openClockAlert.date), 'dd/MM/yyyy')} para "${openClockAlert.job_name}".`
              : `You have an active clock from ${format(new Date(openClockAlert.date), 'MM/dd/yyyy')} for "${openClockAlert.job_name}".`
            }
          </AlertDescription>
        </Alert>
      )}

      <LiveTimeTracker 
        trackingType="work"
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      <ModernCard 
        title={t('myRecords')} 
        icon={Clock}
        noPadding
        className="mt-6"
      >
        <TimeEntryList
          timeEntries={timeEntries}
          isLoading={isLoading}
          showActions={true}
          onEdit={setEditingEntry}
        />
      </ModernCard>
    </EmployeePageLayout>
  );
}