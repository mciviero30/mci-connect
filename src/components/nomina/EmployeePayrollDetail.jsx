import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import SubmitPayrollButton from "./SubmitPayrollButton";
import ApprovePayrollButton from "./ApprovePayrollButton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { buildUserQuery } from "@/components/utils/userResolution";
import { useMemo, useCallback } from 'react';

// NOTE: WeeklyPayroll write guards applied in SubmitPayrollButton component

export default function EmployeePayrollDetail({ employee, initialWeekStart, initialWeekEnd, onClose }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  // State for week navigation
  const [currentWeek, setCurrentWeek] = useState(initialWeekStart);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    staleTime: 300000
  });

  // PERFORMANCE: Fetch individual entities ONLY for editing
  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries', employee.id, employee.email],
    queryFn: () => {
      const query = buildUserQuery(employee, 'user_id', 'employee_email');
      return base44.entities.TimeEntry.filter(query);
    },
    initialData: [],
    staleTime: 30000
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: drivingLogs } = useQuery({
    queryKey: ['drivingLogs', employee.id, employee.email],
    queryFn: () => {
      const query = buildUserQuery(employee, 'user_id', 'employee_email');
      return base44.entities.DrivingLog.filter(query);
    },
    initialData: [],
    staleTime: 30000
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: expenses } = useQuery({
    queryKey: ['expenses', employee.id, employee.email],
    queryFn: () => {
      const query = buildUserQuery(employee, 'user_id', 'employee_email');
      return base44.entities.Expense.filter(query);
    },
    initialData: [],
    staleTime: 30000
  });

  // Fetch approved commissions for the week
  const { data: weekCommissions = [] } = useQuery({
    queryKey: ['weekCommissions', employee.id, weekStart, weekEnd],
    queryFn: async () => {
      if (!employee?.id) return [];
      const commissions = await base44.entities.CommissionRecord.filter({
        user_id: employee.id,
        status: 'approved'
      });
      return commissions.filter(c => {
        const calcDate = new Date(c.calculation_date);
        return calcDate >= weekStart && calcDate <= weekEnd;
      });
    },
    enabled: !!employee?.id
  });

  // PERFORMANCE: Reuse aggregated payroll from parent cache
  const aggregatedPayroll = queryClient.getQueryData([
    'payrollAggregate', 
    format(weekStart, 'yyyy-MM-dd'), 
    format(weekEnd, 'yyyy-MM-dd')
  ]);

  const currentWeekPayroll = aggregatedPayroll?.payrollData?.find(p => 
    p.employee.id === employee.id
  )?.weekPayroll || null;

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Time entry updated');
    }
  });

  const updateDrivingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrivingLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      toast.success('Driving log updated');
    }
  });

  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  // PERFORMANCE: Memoize getDayData function
  const getDayData = useCallback((date) => {
    // FILTER BY APPROVED STATUS
    const workEntries = timeEntries.filter(e =>
      isSameDay(new Date(e.date), date) && e.status === 'approved'
    );
    const drivingEntry = drivingLogs.find(d =>
      isSameDay(new Date(d.date), date) && d.status === 'approved'
    );
    const perDiemExpenses = expenses.filter(p =>
      isSameDay(new Date(p.date), date) &&
      p.category === 'per_diem' &&
      p.status === 'approved'
    );
    // SOLO GASTOS PERSONALES (no per diem, payment_method = personal)
    const personalExpenses = expenses.filter(e =>
      isSameDay(new Date(e.date), date) &&
      e.category !== 'per_diem' &&
      e.payment_method === 'personal' &&
      e.status === 'approved'
    );

    const totalWorkHours = workEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

    return {
      workEntries,
      drivingEntry,
      perDiemExpenses,
      personalExpenses,
      totalWorkHours,
      drivingHours: drivingEntry?.hours || 0,
      drivingMiles: drivingEntry?.miles || 0,
      perDiemAmount: perDiemExpenses.reduce((sum, p) => sum + (p.amount || 0), 0),
      reimbursementsAmount: personalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [timeEntries, drivingLogs, expenses]);

  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({});

  const handleEdit = useCallback((entry, type) => {
    setEditingEntry({ ...entry, type });
    setFormData({
      ...entry,
      check_in: entry.check_in?.substring(0, 5) || '',
      check_out: entry.check_out?.substring(0, 5) || ''
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingEntry) return;

    const calculateHours = () => {
      if (!formData.check_in || !formData.check_out) return 0;
      const [inH, inM] = formData.check_in.split(':').map(Number);
      const [outH, outM] = formData.check_out.split(':').map(Number);
      const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (formData.lunch_minutes || 0);
      return Math.max(0, minutes / 60);
    };

    if (editingEntry.type === 'work') {
      const hours_worked = calculateHours();
      const hour_type = hours_worked > 8 ? 'overtime' : 'normal'; // This daily classification is for display/internal storage, weekly calc is primary

      updateTimeMutation.mutate({
        id: editingEntry.id,
        data: {
          ...formData,
          check_in: formData.check_in + ':00',
          check_out: formData.check_out + ':00',
          hours_worked,
          hour_type
        }
      });
    } else if (editingEntry.type === 'driving') {
      updateDrivingMutation.mutate({
        id: editingEntry.id,
        data: formData
      });
    }

    setEditingEntry(null);
    setFormData({});
  }, [editingEntry, formData, updateTimeMutation, updateDrivingMutation]);

  const hourlyRate = employee.hourly_rate || 25;

  // PERFORMANCE: Memoize weekly totals calculation
  const weekTotals = useMemo(() => 
    weekDays.reduce((acc, date) => {
      const day = getDayData(date);
      return {
        totalWorkHours: acc.totalWorkHours + day.totalWorkHours,
        drivingHours: acc.drivingHours + day.drivingHours,
        drivingMiles: acc.drivingMiles + day.drivingMiles,
        perDiem: acc.perDiem + day.perDiemAmount,
        reimbursements: acc.reimbursements + day.reimbursementsAmount
      };
    }, { totalWorkHours: 0, drivingHours: 0, drivingMiles: 0, perDiem: 0, reimbursements: 0 }),
    [weekDays, getDayData]
  );

  // PERFORMANCE: Memoize pay calculations
  const payCalculations = useMemo(() => {
    // OVERTIME = only after 40h of WORK (not including driving)
    const regularHours = Math.min(weekTotals.totalWorkHours, 40);
    const overtimeHours = Math.max(0, weekTotals.totalWorkHours - 40);

    // Calculate pays
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const workPay = regularPay + overtimePay;

    // DRIVING: hours at normal rate, miles at $0.70/mi
    const drivingHoursPay = weekTotals.drivingHours * hourlyRate;
    const mileagePay = weekTotals.drivingMiles * 0.60;
    const totalDrivingPay = drivingHoursPay + mileagePay;

    // COMMISSION: sum approved commissions for the week
    const totalCommission = weekCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const totalPay = workPay + totalDrivingPay + weekTotals.perDiem + weekTotals.reimbursements + totalCommission;

    return {
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      workPay,
      drivingHoursPay,
      mileagePay,
      totalDrivingPay,
      totalCommission,
      totalPay
    };
  }, [weekTotals, hourlyRate, weekCommissions]);

  const payrollData = {
    regularHours: payCalculations.regularHours,
    overtimeHours: payCalculations.overtimeHours,
    drivingHours: weekTotals.drivingHours,
    drivingMiles: weekTotals.drivingMiles,
    perDiemAmount: weekTotals.perDiem,
    workPay: payCalculations.workPay,
    drivingPay: payCalculations.totalDrivingPay,
    reimbursements: weekTotals.reimbursements,
    totalPay: payCalculations.totalPay
  };

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-slate-600/50 text-slate-300 border-slate-700' },
    submitted: { label: 'Pending Approval', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    paid: { label: 'Paid', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  };

  // Week description
  const weekDescription = isCurrentWeek
    ? t('currentWeek')
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center min-w-[280px]">
          <p className="text-lg font-bold text-white">{weekDescription}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Payroll Status & Actions */}
      <Card className="border-slate-700 bg-slate-800/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-slate-400 mb-1">Payroll Status</p>
                {currentWeekPayroll ? (
                  <Badge className={statusConfig[currentWeekPayroll.status]?.color}>
                    {statusConfig[currentWeekPayroll.status]?.label || currentWeekPayroll.status}
                  </Badge>
                ) : (
                  <Badge className={statusConfig.draft.color}>
                    {statusConfig.draft.label}
                  </Badge>
                )}
              </div>
              {currentWeekPayroll?.notes && (
                <div className="text-xs text-slate-500 italic max-w-xs">
                  Note: {currentWeekPayroll.notes}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <SubmitPayrollButton
                employee={employee}
                weekStart={weekStart}
                weekEnd={weekEnd}
                payrollData={payrollData}
                existingPayroll={currentWeekPayroll}
              />
              {currentWeekPayroll && (
                <ApprovePayrollButton payroll={currentWeekPayroll} />
              )}
            </div>
          </div>

          {currentWeekPayroll?.status === 'rejected' && currentWeekPayroll.rejection_reason && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-400 text-sm mb-1">Rejection Reason:</h4>
                  <p className="text-sm text-red-300">{currentWeekPayroll.rejection_reason}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Rejected by {currentWeekPayroll.approved_by_name || 'N/A'} on {format(new Date(currentWeekPayroll.approved_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card - UPDATED WITH CORRECT CALCULATIONS */}
      <Card className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border-emerald-500/20 shadow-xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-400">{t('regularHours')}</p>
              <p className="text-2xl font-bold text-emerald-400">{payCalculations.regularHours.toFixed(2)}h</p>
              <p className="text-xs text-slate-500 mt-1">${payCalculations.regularPay.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">{t('overtimeHours')}</p>
              <p className="text-2xl font-bold text-amber-400">{payCalculations.overtimeHours.toFixed(2)}h</p>
              <p className="text-xs text-slate-500 mt-1">${payCalculations.overtimePay.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">{t('drivingHours')}</p>
              <p className="text-2xl font-bold text-blue-400">{weekTotals.drivingHours.toFixed(2)}h</p>
              <p className="text-xs text-slate-500 mt-1">${payCalculations.drivingHoursPay.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Millas</p>
              <p className="text-2xl font-bold text-cyan-400">{weekTotals.drivingMiles.toFixed(0)} mi</p>
              <p className="text-xs text-slate-500 mt-1">${payCalculations.mileagePay.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">{t('perDiem')}</p>
              <p className="text-2xl font-bold text-purple-400">${weekTotals.perDiem.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Recibos</p>
              <p className="text-2xl font-bold text-pink-400">${weekTotals.reimbursements.toFixed(2)}</p>
            </div>
            {payCalculations.totalCommission > 0 && (
              <div>
                <p className="text-sm text-slate-400">Comisiones</p>
                <p className="text-2xl font-bold text-green-400">${payCalculations.totalCommission.toFixed(2)}</p>
              </div>
            )}
            <div className={payCalculations.totalCommission > 0 ? 'col-span-1' : 'col-span-2'}>
              <p className="text-sm text-slate-400">{t('totalPay')}</p>
              <p className="text-3xl font-bold text-emerald-400">${payCalculations.totalPay.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Details */}
      {weekCommissions.length > 0 && (
        <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/20 shadow-xl">
          <CardContent className="p-4">
            <h3 className="font-bold text-lg text-green-400 mb-3">
              ✅ Approved Commissions (${payCalculations.totalCommission.toFixed(2)})
            </h3>
            <div className="space-y-2">
              {weekCommissions.map(comm => (
                <div key={comm.id} className="p-3 bg-slate-800/50 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                        {comm.trigger_entity_number}
                      </Badge>
                      <span className="text-sm text-slate-300">
                        {comm.rule_snapshot?.rule_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(comm.calculation_date), 'MMM d')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">${comm.commission_amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{comm.calculation_inputs?.model_used}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">
              Read-only: Commissions are automatically calculated when invoices are paid
            </p>
          </CardContent>
        </Card>
      )}

      {/* Daily Details */}
      <div className="space-y-3">
        {weekDays.map((date) => {
          const dayData = getDayData(date);

          return (
            <Card key={date.toString()} className="glass-card border-slate-700 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-white">{format(date, 'EEEE, MMM d')}</h3>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {dayData.totalWorkHours > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        {dayData.totalWorkHours.toFixed(2)}h work
                      </span>
                    )}
                    {dayData.drivingHours > 0 && (
                      <span className="text-blue-400 font-semibold">
                        {dayData.drivingHours.toFixed(2)}h driving
                      </span>
                    )}
                    {dayData.drivingMiles > 0 && (
                      <span className="text-cyan-400 font-semibold">
                        {dayData.drivingMiles.toFixed(0)} mi
                      </span>
                    )}
                    {dayData.perDiemAmount > 0 && (
                      <span className="text-purple-400 font-semibold">
                        ${dayData.perDiemAmount.toFixed(2)} per diem
                      </span>
                    )}
                    {dayData.reimbursementsAmount > 0 && (
                      <span className="text-pink-400 font-semibold">
                        ${dayData.reimbursementsAmount.toFixed(2)} recibos
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Work Entries */}
                  {dayData.workEntries.map((entry) => (
                    <div key={entry.id} className="p-3 bg-slate-800/70 rounded-lg border border-slate-700">
                      {editingEntry?.id === entry.id ? (
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3">
                            <label className="text-xs text-slate-400">{t('job')}</label>
                            <Select value={formData.job_id} onValueChange={v => setFormData({...formData, job_id: v})}>
                              <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                {jobs.map(j => <SelectItem key={j.id} value={j.id} className="text-white">{j.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400">{t('start')}</label>
                            <Input type="time" value={formData.check_in} onChange={e => setFormData({...formData, check_in: e.target.value})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400">{t('end')}</label>
                            <Input type="time" value={formData.check_out} onChange={e => setFormData({...formData, check_out: e.target.value})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-1">
                            <label className="text-xs text-slate-400">{t('lunch')}</label>
                            <Input type="number" value={formData.lunch_minutes || 0} onChange={e => setFormData({...formData, lunch_minutes: parseInt(e.target.value)})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400">{t('notes')}</label>
                            <Input value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-2 flex gap-1">
                            <Button size="sm" onClick={handleSave} className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-700"><Save className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)} className="h-8 flex-1 bg-slate-900 border-slate-700 text-white"><X className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center flex-1">
                            <span className="text-sm font-medium text-white">{entry.job_name}</span>
                            <span className="text-sm text-slate-400">{entry.check_in?.substring(0, 5)} - {entry.check_out?.substring(0, 5)}</span>
                            <span className="text-sm font-bold text-emerald-400">{entry.hours_worked?.toFixed(2)}h</span>
                            {entry.notes && <span className="text-xs text-slate-500">{entry.notes}</span>}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(entry, 'work')} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                            {t('edit')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Driving Entry */}
                  {dayData.drivingEntry && (
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                      {editingEntry?.id === dayData.drivingEntry.id ? (
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400">{t('hours')}</label>
                            <Input type="number" step="0.1" value={formData.hours} onChange={e => setFormData({...formData, hours: parseFloat(e.target.value)})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400">{t('miles')}</label>
                            <Input type="number" step="0.1" value={formData.miles} onChange={e => setFormData({...formData, miles: parseFloat(e.target.value)})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-6">
                            <label className="text-xs text-slate-400">{t('notes')}</label>
                            <Input value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="h-8 bg-slate-900 border-slate-700 text-white" />
                          </div>
                          <div className="col-span-2 flex gap-1">
                            <Button size="sm" onClick={handleSave} className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-700"><Save className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)} className="h-8 flex-1 bg-slate-900 border-slate-700 text-white"><X className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center flex-1">
                            <span className="text-sm font-medium text-blue-300">🚗 {t('driving')}</span>
                            <span className="text-sm text-blue-400">{dayData.drivingHours.toFixed(1)}h</span>
                            <span className="text-sm text-blue-400">{dayData.drivingEntry.miles} mi</span>
                            <span className="text-sm font-bold text-blue-300">${dayData.drivingEntry.total_amount?.toFixed(2)}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(dayData.drivingEntry, 'driving')} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                            {t('edit')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per Diem */}
                  {dayData.perDiemExpenses.map((perDiem) => (
                    <div key={perDiem.id} className="p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <span className="text-sm font-medium text-purple-300">💵 {t('perDiem')}</span>
                          <span className="text-sm font-bold text-purple-300">${perDiem.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Personal Expenses (Recibos) */}
                  {dayData.personalExpenses.map((expense) => (
                    <div key={expense.id} className="p-3 bg-pink-900/30 rounded-lg border border-pink-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 items-center flex-1">
                          <span className="text-sm font-medium text-pink-300">🧾 {expense.category}</span>
                          <span className="text-sm text-pink-400">{expense.description}</span>
                          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs">
                            Personal
                          </Badge>
                          <span className="text-sm font-bold text-pink-300">${expense.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}