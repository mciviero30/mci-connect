
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Car, Banknote, Receipt, ChevronLeft, ChevronRight, CheckCircle, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '../components/shared/PageHeader';
import StatsCard from '../components/shared/StatsCard';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function MyPayroll() {
  const { t, language } = useLanguage();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: timeEntries } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => user ? base44.entities.TimeEntry.filter({ employee_email: user.email }) : [],
    initialData: [],
    enabled: !!user,
  });

  const { data: drivingLogs } = useQuery({
    queryKey: ['myDrivingLogs', user?.email],
    queryFn: () => user ? base44.entities.DrivingLog.filter({ employee_email: user.email }) : [],
    initialData: [],
    enabled: !!user,
  });

  const { data: expenses } = useQuery({
    queryKey: ['myExpenses', user?.email],
    queryFn: () => user ? base44.entities.Expense.filter({ employee_email: user.email }) : [],
    initialData: [],
    enabled: !!user,
  });

  const { data: weeklyPayrolls } = useQuery({
    queryKey: ['myWeeklyPayrolls', user?.email],
    queryFn: () => user ? base44.entities.WeeklyPayroll.filter({ employee_email: user.email }, '-week_start') : [],
    initialData: [],
    enabled: !!user,
  });

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
  const totalPay = normalWorkPay + overtimeWorkPay + drivingHoursPay + drivingMilesPay + perDiemAmount + reimbursements;

  const existingPayroll = weeklyPayrolls.find(p => {
    const pStart = new Date(p.week_start);
    return pStart.getTime() === weekStart.getTime();
  });

  const payrollStatus = existingPayroll?.status || 'draft';

  const statusConfig = {
    draft: { 
      label: language === 'es' ? 'Borrador' : 'Draft', 
      color: 'bg-slate-600/50 text-slate-300',
      description: language === 'es' ? 'No enviado' : 'Not submitted'
    },
    submitted: { 
      label: language === 'es' ? 'Enviado' : 'Submitted', 
      color: 'bg-blue-500/20 text-blue-400',
      description: language === 'es' ? 'Esperando aprobación' : 'Awaiting approval'
    },
    approved: { 
      label: language === 'es' ? 'Aprobado' : 'Approved', 
      color: 'bg-emerald-500/20 text-emerald-400',
      description: language === 'es' ? 'Aprobado por administrador' : 'Approved by admin'
    },
    rejected: { 
      label: language === 'es' ? 'Rechazado' : 'Rejected', 
      color: 'bg-red-500/20 text-red-400',
      description: existingPayroll?.rejection_reason || (language === 'es' ? 'Rechazado por administrador' : 'Rejected by admin')
    },
    paid: { 
      label: language === 'es' ? 'Pagado' : 'Paid', 
      color: 'bg-cyan-500/20 text-cyan-400',
      description: language === 'es' ? `Pagado el ${existingPayroll?.approved_date ? format(new Date(existingPayroll.approved_date), 'MMM d, yyyy') : ''}` : `Paid on ${existingPayroll?.approved_date ? format(new Date(existingPayroll.approved_date), 'MMM d, yyyy') : ''}`
    }
  };

  const config = statusConfig[payrollStatus];

  const nextPayDate = addWeeks(weekEnd, 1);
  nextPayDate.setDate(nextPayDate.getDate() + (5 - nextPayDate.getDay() + 7) % 7); // Set to next Friday after weekEnd

  const groupedByDate = weekTimeEntries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) acc[date] = { timeEntries: [], drivingLogs: [], expenses: [] };
    acc[date].timeEntries.push(entry);
    return acc;
  }, {});

  weekDrivingLogs.forEach(log => {
    const date = log.date;
    if (!groupedByDate[date]) groupedByDate[date] = { timeEntries: [], drivingLogs: [], expenses: [] };
    groupedByDate[date].drivingLogs.push(log);
  });

  weekExpenses.forEach(exp => {
    const date = exp.date;
    if (!groupedByDate[date]) groupedByDate[date] = { timeEntries: [], drivingLogs: [], expenses: [] };
    groupedByDate[date].expenses.push(exp);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  const isCurrentWeek = weekStart.getTime() === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Mi Nómina' : 'My Payroll'}
          description={language === 'es' ? 'Rastrea tus horas de trabajo' : 'Track your work hours'}
          icon={Banknote}
        />

        {/* Next Payment Card - Always visible */}
        <Card className="bg-white shadow-xl border-emerald-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-600">
                    {language === 'es' ? 'Próximo Pago' : 'Next Payment'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {language === 'es' ? 'Semana' : 'Week'}: {format(weekStart, 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(weekEnd, 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">
                  {language === 'es' ? 'Fecha de pago:' : 'Payment date:'}
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {format(nextPayDate, 'EEEE, MMM d', { locale: language === 'es' ? es : undefined })}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${totalPay.toFixed(2)}
                </p>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Card className="bg-white shadow-xl border-slate-200 flex-1 mx-4">
            <CardContent className="p-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {language === 'es' ? 'Semana Actual' : 'Current Week'}
                </h3>
                <p className="text-sm text-[#3B9FF3]">
                  {format(weekStart, 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(weekEnd, 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                </p>
                {isCurrentWeek && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 mt-2">
                    {language === 'es' ? `Se paga el ${format(nextPayDate, 'EEEE, MMM d', { locale: es })}` : `Pays on ${format(nextPayDate, 'EEEE, MMM d')}`}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            disabled={isCurrentWeek}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Card className="bg-white shadow-xl border-slate-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{language === 'es' ? 'Estado del Payroll' : 'Payroll Status'}</p>
                <Badge className={config.color}>{config.label}</Badge>
                <p className="text-xs text-slate-500 mt-1">{config.description}</p>
              </div>
              {(payrollStatus === 'draft' || payrollStatus === 'rejected') && totalPay > 0 && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {language === 'es' ? 'Enviar para Aprobación' : 'Submit for Approval'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={language === 'es' ? 'Horas de Trabajo' : 'Work Hours'}
            value={`${totalWorkHours.toFixed(1)}h`}
            subtitle={`${normalWorkHours.toFixed(1)}h ${language === 'es' ? 'Normal' : 'Normal'}`}
            icon={Clock}
            color="from-cyan-500 to-blue-500"
          />
          <StatsCard
            title={language === 'es' ? 'Manejo' : 'Driving'}
            value={`${totalDrivingHours.toFixed(1)}h`}
            subtitle={`${totalDrivingMiles} ${language === 'es' ? 'Millas' : 'Miles'}`}
            icon={Car}
            color="from-blue-500 to-blue-700"
          />
          <StatsCard
            title={language === 'es' ? 'Per Diem & Gastos' : 'Per Diem & Expenses'}
            value={`$${(perDiemAmount + reimbursements).toFixed(2)}`}
            subtitle={`${language === 'es' ? 'Per Diem' : 'Per Diem'}: $${perDiemAmount.toFixed(2)}\n${language === 'es' ? 'Reembolsos' : 'Receipts'}: $${reimbursements.toFixed(2)}`}
            icon={Receipt}
            color="from-slate-600 to-slate-700"
          />
          <StatsCard
            title={language === 'es' ? 'Pago Total' : 'Total Pay'}
            value={`$${totalPay.toFixed(2)}`}
            icon={DollarSign}
            color="from-emerald-500 to-emerald-700"
          />
        </div>

        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <CalendarDays className="w-5 h-5 text-[#3B9FF3]" />
              {language === 'es' ? 'Desglose Diario' : 'Daily Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {sortedDates.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">
                  {language === 'es' ? 'No hay horas ni gastos' : 'No hours or expenses'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => {
                  const data = groupedByDate[date];
                  const dayWorkHours = data.timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
                  const dayDrivingHours = data.drivingLogs.reduce((sum, d) => sum + (d.hours || 0), 0);
                  const dayDrivingMiles = data.drivingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);
                  const dayPerDiem = data.expenses.filter(e => e.category === 'per_diem').reduce((sum, e) => sum + (e.amount || 0), 0);
                  const dayReimbursements = data.expenses.filter(e => e.payment_method === 'personal' && e.category !== 'per_diem').reduce((sum, e) => sum + (e.amount || 0), 0);

                  return (
                    <div key={date} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <h4 className="font-bold text-slate-900 mb-4">
                        {format(new Date(date), 'EEEE, MMMM d', { locale: language === 'es' ? es : undefined })}
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-600" />
                            {language === 'es' ? 'Horas' : 'Hours'}
                          </p>
                          <p className="text-slate-900 font-semibold">{dayWorkHours.toFixed(1)}h</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-2 flex items-center gap-2">
                            <Car className="w-4 h-4 text-blue-600" />
                            {language === 'es' ? 'Manejo' : 'Driving'}
                          </p>
                          <p className="text-slate-900 font-semibold">{dayDrivingHours.toFixed(1)}h / {dayDrivingMiles} {language === 'es' ? 'millas' : 'miles'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-2 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-600" />
                            {language === 'es' ? 'Gastos' : 'Expenses'}
                          </p>
                          <p className="text-slate-900 font-semibold">
                            ${(dayPerDiem + dayReimbursements).toFixed(2)}
                          </p>
                          {dayPerDiem > 0 && (
                            <p className="text-xs text-slate-500">
                              Per Diem: ${dayPerDiem.toFixed(2)}
                            </p>
                          )}
                          {dayReimbursements > 0 && (
                            <p className="text-xs text-slate-500">
                              {language === 'es' ? 'Reembolsos' : 'Receipts'}: ${dayReimbursements.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
