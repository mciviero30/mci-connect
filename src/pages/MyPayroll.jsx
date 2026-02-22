import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Car, Banknote, Receipt, ChevronLeft, ChevronRight, CheckCircle, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import { es } from 'date-fns/locale';
import { useLanguage } from '@/components/i18n/LanguageContext';
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";
import { buildUserQuery } from "@/components/utils/userResolution";

export default function MyPayroll() {
  const { language } = useLanguage();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.TimeEntry.filter(query);
    },
    enabled: !!user,
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['myDrivingLogs', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.DrivingLog.filter(query);
    },
    enabled: !!user,
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: expenses = [] } = useQuery({
    queryKey: ['myExpenses', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.Expense.filter(query);
    },
    enabled: !!user,
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: weeklyPayrolls = [] } = useQuery({
    queryKey: ['myWeeklyPayrolls', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.WeeklyPayroll.filter(query, '-week_start');
    },
    enabled: !!user,
  });

  // Fetch approved commissions for the week
  const { data: weekCommissions = [] } = useQuery({
    queryKey: ['myWeekCommissions', user?.id, currentWeekStart, currentWeekEnd],
    queryFn: async () => {
      if (!user?.id) return [];
      const commissions = await base44.entities.CommissionRecord.filter({
        user_id: user.id,
        status: 'approved'
      });
      // Filter by calculation_date in period
      return commissions.filter(c => {
        const calcDate = new Date(c.calculation_date);
        return calcDate >= currentWeekStart && calcDate <= currentWeekEnd;
      });
    },
    enabled: !!user?.id
  });

  const calculations = useMemo(() => {
    const weekStart = currentWeekStart;
    const weekEnd = currentWeekEnd;

    const weekTimeEntries = timeEntries.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= weekStart && eDate <= weekEnd && e.status === 'approved';
    });

    const weekDrivingLogs = drivingLogs.filter(d => {
      const dDate = new Date(d.date);
      return dDate >= weekStart && dDate <= weekEnd && d.status === 'approved';
    });

    const weekExpenses = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= weekStart && eDate <= weekEnd && e.status === 'approved';
    });

    const totalWorkHours = weekTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const normalWorkHours = Math.min(totalWorkHours, 40);
    const overtimeWorkHours = Math.max(0, totalWorkHours - 40);
    const totalDrivingHours = weekDrivingLogs.reduce((sum, d) => sum + (d.hours || 0), 0);
    const totalDrivingMiles = weekDrivingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);
    const drivingMilesPay = totalDrivingMiles * 0.60;
    const perDiemAmount = weekExpenses.filter(e => e.category === 'per_diem').reduce((sum, e) => sum + (e.amount || 0), 0);
    const reimbursements = weekExpenses.filter(e => e.payment_method === 'personal' && e.category !== 'per_diem').reduce((sum, e) => sum + (e.amount || 0), 0);

    const hourlyRate = user?.hourly_rate || 25;
    const normalWorkPay = normalWorkHours * hourlyRate;
    const overtimeWorkPay = overtimeWorkHours * (hourlyRate * 1.5);
    const drivingHoursPay = totalDrivingHours * hourlyRate;
    const totalCommission = weekCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const totalPay = normalWorkPay + overtimeWorkPay + drivingHoursPay + drivingMilesPay + perDiemAmount + reimbursements + totalCommission;

    const groupedByDate = {};
    weekTimeEntries.forEach(entry => {
      if (!groupedByDate[entry.date]) groupedByDate[entry.date] = { timeEntries: [], drivingLogs: [], expenses: [] };
      groupedByDate[entry.date].timeEntries.push(entry);
    });
    weekDrivingLogs.forEach(log => {
      if (!groupedByDate[log.date]) groupedByDate[log.date] = { timeEntries: [], drivingLogs: [], expenses: [] };
      groupedByDate[log.date].drivingLogs.push(log);
    });
    weekExpenses.forEach(exp => {
      if (!groupedByDate[exp.date]) groupedByDate[exp.date] = { timeEntries: [], drivingLogs: [], expenses: [] };
      groupedByDate[exp.date].expenses.push(exp);
    });

    return {
      totalWorkHours, normalWorkHours, overtimeWorkHours, totalDrivingHours, totalDrivingMiles,
      drivingMilesPay, perDiemAmount, reimbursements, totalPay, groupedByDate
    };
  }, [timeEntries, drivingLogs, expenses, currentWeekStart, currentWeekEnd, user?.hourly_rate]);

  const existingPayroll = weeklyPayrolls.find(p => new Date(p.week_start).getTime() === currentWeekStart.getTime());
  const payrollStatus = existingPayroll?.status || 'draft';

  const statusConfig = {
    draft: { label: language === 'es' ? 'Borrador' : 'Draft', color: 'bg-slate-100 text-slate-700' },
    submitted: { label: language === 'es' ? 'Enviado' : 'Submitted', color: 'bg-blue-100 text-blue-700' },
    approved: { label: language === 'es' ? 'Aprobado' : 'Approved', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: language === 'es' ? 'Rechazado' : 'Rejected', color: 'bg-red-100 text-red-700' },
    paid: { label: language === 'es' ? 'Pagado' : 'Paid', color: 'bg-cyan-100 text-cyan-700' }
  };

  const config = statusConfig[payrollStatus];
  const nextPayDate = addWeeks(currentWeekEnd, 1);
  nextPayDate.setDate(nextPayDate.getDate() + (5 - nextPayDate.getDay() + 7) % 7);
  const isCurrentWeek = currentWeekStart.getTime() === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
  const sortedDates = Object.keys(calculations.groupedByDate).sort();

  const pageStats = [
    {
      icon: Clock,
      value: `${calculations.totalWorkHours.toFixed(1)}h`,
      label: language === 'es' ? 'Horas Trabajo' : 'Work Hours',
      subtitle: calculations.overtimeWorkHours > 0 ? `+${calculations.overtimeWorkHours.toFixed(1)}h OT` : undefined,
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Car,
      value: `${calculations.totalDrivingHours.toFixed(1)}h`,
      label: language === 'es' ? 'Manejo' : 'Driving',
      subtitle: `${calculations.totalDrivingMiles} miles`,
      iconBg: "bg-purple-100 dark:bg-purple-900/50",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: Receipt,
      value: `$${(calculations.perDiemAmount + calculations.reimbursements).toFixed(0)}`,
      label: language === 'es' ? 'Gastos' : 'Expenses',
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      icon: DollarSign,
      value: `$${calculations.totalPay.toFixed(0)}`,
      label: language === 'es' ? 'Total' : 'Total Pay',
      iconBg: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-600 dark:text-green-400"
    }
  ];

  return (
    <EmployeePageLayout
      title={language === 'es' ? 'Mi Nómina' : 'My Payroll'}
      subtitle={language === 'es' ? 'Rastrea tus horas de trabajo' : 'Track your work hours'}
      stats={pageStats}
    >
      {/* Next Payment Card */}
      <Card className="bg-white dark:bg-[#282828] shadow-lg border-0 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                  {language === 'es' ? 'Próximo Pago' : 'Next Payment'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {format(currentWeekStart, 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(currentWeekEnd, 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">${calculations.totalPay.toFixed(2)}</p>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Selector */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <Button variant="outline" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <Card className="bg-white dark:bg-[#282828] shadow-sm border-0 flex-1">
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Semana' : 'Week'}
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {format(currentWeekStart, 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(currentWeekEnd, 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
            </p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} disabled={isCurrentWeek}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Commission Section */}
      {calculations.totalCommission > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg border-green-200 dark:border-green-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                    {language === 'es' ? 'Comisiones Aprobadas' : 'Approved Commissions'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {weekCommissions.length} {weekCommissions.length === 1 ? 'commission' : 'commissions'} this week
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${calculations.totalCommission.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'es' ? 'Incluido en el total' : 'Included in total pay'}
                </p>
              </div>
            </div>
            
            {/* Commission Details */}
            <div className="mt-4 space-y-2">
              {weekCommissions.map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                      {comm.trigger_entity_number || comm.trigger_entity_id}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {comm.rule_snapshot?.rule_name}
                    </span>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ${comm.commission_amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      <ModernCard title={language === 'es' ? 'Desglose Diario' : 'Daily Breakdown'} icon={CalendarDays}>
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {language === 'es' ? 'No hay horas ni gastos' : 'No hours or expenses'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(date => {
              const data = calculations.groupedByDate[date];
              const dayWorkHours = data.timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
              const dayDrivingHours = data.drivingLogs.reduce((sum, d) => sum + (d.hours || 0), 0);
              const dayDrivingMiles = data.drivingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);
              const dayExpenses = data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

              return (
                <div key={date} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3">
                    {format(new Date(date), 'EEEE, MMMM d', { locale: language === 'es' ? es : undefined })}
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-600 dark:text-slate-400">{dayWorkHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-purple-600" />
                      <span className="text-slate-600 dark:text-slate-400">{dayDrivingHours.toFixed(1)}h / {dayDrivingMiles}mi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      <span className="text-slate-600 dark:text-slate-400">${dayExpenses.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModernCard>
    </EmployeePageLayout>
  );
}