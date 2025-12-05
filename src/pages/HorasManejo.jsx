import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Calendar, TrendingUp, DollarSign, Car } from 'lucide-react';
import LiveTimeTracker from '../components/horarios/LiveTimeTracker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { useLanguage } from "@/components/i18n/LanguageContext";
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";

export default function HorasManejo() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: drivingLogs = [], isLoading } = useQuery({
    queryKey: ['myDrivingLogs', user?.email], 
    queryFn: () => user ? base44.entities.DrivingLog.filter({ employee_email: user.email }, '-date') : [],
    enabled: !!user,
  });

  const createDrivingMutation = useMutation({
    mutationFn: async (entryData) => {
      const miles = parseFloat(entryData.miles) || 0;
      const hours = parseFloat(entryData.hours) || 0;
      const ratePerMile = 0.60;
      const hourlyRate = parseFloat(user?.hourly_rate || 25);
      const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);

      return base44.entities.DrivingLog.create({
        ...entryData,
        employee_email: user.email,
        employee_name: user.full_name,
        rate_per_mile: ratePerMile,
        total_amount: totalAmount,
        status: 'pending'
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myDrivingLogs'] })
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);

  const stats = useMemo(() => {
    const currentWeekLogs = drivingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart && logDate <= weekEnd && log.status === 'approved';
    });
    const currentWeekHours = currentWeekLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const currentWeekMiles = currentWeekLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const weekPay = currentWeekLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    const currentMonthLogs = drivingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= monthStart && logDate <= endOfMonth(today) && log.status === 'approved';
    });
    const currentMonthHours = currentMonthLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const currentMonthMiles = currentMonthLogs.reduce((sum, log) => sum + (log.miles || 0), 0);

    const ytdLogs = drivingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= yearStart && log.status === 'approved';
    });
    const ytdHours = ytdLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const ytdMiles = ytdLogs.reduce((sum, log) => sum + (log.miles || 0), 0);

    return { currentWeekHours, currentWeekMiles, weekPay, currentMonthHours, currentMonthMiles, ytdHours, ytdMiles };
  }, [drivingLogs, weekStart, weekEnd, monthStart, yearStart, today]);

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
    approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
  };

  const pageStats = [
    {
      icon: Clock,
      value: `${stats.currentWeekHours.toFixed(1)}h`,
      label: t('currentWeek'),
      subtitle: `${stats.currentWeekMiles.toFixed(0)} miles`,
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: DollarSign,
      value: `$${stats.weekPay.toFixed(0)}`,
      label: language === 'es' ? 'Pago Semanal' : 'Weekly Pay',
      subtitle: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      iconBg: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: Calendar,
      value: `${stats.currentMonthHours.toFixed(1)}h`,
      label: t('thisMonth'),
      subtitle: `${stats.currentMonthMiles.toFixed(0)} miles`,
      iconBg: "bg-purple-100 dark:bg-purple-900/50",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: TrendingUp,
      value: `${stats.ytdHours.toFixed(0)}h`,
      label: t('yearToDate'),
      subtitle: `${stats.ytdMiles.toFixed(0)} miles`,
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <EmployeePageLayout
      title={language === 'es' ? 'Horas de Manejo' : 'Driving Hours'}
      subtitle={language === 'es' ? 'Registra tus horas de conducción' : 'Track your driving hours'}
      stats={pageStats}
    >
      <LiveTimeTracker 
        trackingType="driving"
        onSave={(data) => createDrivingMutation.mutate(data)}
        isLoading={createDrivingMutation.isPending}
      />

      <ModernCard 
        title={t('myRecords')} 
        icon={Car}
        noPadding
        className="mt-6"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <TableHead className="text-slate-700 dark:text-slate-300">{t('date')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('job')}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Horas' : 'Hours'}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Pago' : 'Pay'}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                </TableRow>
              ) : drivingLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-slate-500">
                    {language === 'es' ? 'No hay registros de horas de manejo' : 'No driving hours records'}
                  </TableCell>
                </TableRow>
              ) : (
                drivingLogs?.map(log => {
                  const config = statusConfig[log.status] || statusConfig.pending;
                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <TableCell className="text-slate-700 dark:text-slate-300">{format(new Date(log.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{log.job_name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">{(log.hours || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">{(log.miles || 0).toFixed(1)}mi</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 dark:text-white">${(log.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge className={config.color}>{config.label}</Badge></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ModernCard>
    </EmployeePageLayout>
  );
}