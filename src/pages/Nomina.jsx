import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Download, Search, Edit, User, FileText, Briefcase, Car, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import StatsSummaryGrid from "../components/shared/StatsSummaryGrid";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmployeePayrollDetail from "../components/nomina/EmployeePayrollDetail";
import DateRangeFilter from "../components/reportes/DateRangeFilter";
import AutoPayrollCalculator from "../components/payroll/AutoPayrollCalculator";
import PaystubGenerator from "../components/payroll/PaystubGenerator";
import { Loader2 } from "lucide-react";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { useMemo, useCallback } from 'react';

export default function Nomina() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showPaystub, setShowPaystub] = useState(false);
  const [paystubEmployee, setPaystubEmployee] = useState(null);
  
  // NEW: Date range state (default to current month)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end, preset: 'this_month' };
  });

  const weekStart = dateRange.start;
  const weekEnd = dateRange.end;

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch all data needed to build payroll manually
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['nomina-employees'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }, 'full_name'),
    enabled: !!user,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ['nomina-timeentries', weekStartStr, weekEndStr],
    queryFn: () => base44.entities.TimeEntry.filter({
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'approved'
    }, '-date', 500),
    enabled: !!user,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: drivingLogs = [], isLoading: drivingLoading } = useQuery({
    queryKey: ['nomina-driving', weekStartStr, weekEndStr],
    queryFn: () => base44.entities.DrivingLog.filter({
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'approved'
    }, '-date', 500),
    enabled: !!user,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['nomina-expenses', weekStartStr, weekEndStr],
    queryFn: () => base44.entities.Expense.filter({
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'approved'
    }, '-date', 500),
    enabled: !!user,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['nomina-users'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }, 'full_name', 200),
    enabled: !!user,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const payrollLoading = employeesLoading || timeLoading || drivingLoading || expensesLoading || usersLoading;

  // Build payroll data from raw entities
  const payrollData = useMemo(() => {
    if (!allEmployees.length) return [];
    
    // Build a map of user data (hourly_rate, etc.) keyed by email
    const userMap = users.reduce((acc, u) => {
      acc[u.email] = u;
      return acc;
    }, {});

    return allEmployees.map(emp => {
      const empEmail = emp.employee_email;
      const userData = userMap[empEmail] || {};
      const hourlyRate = parseFloat(userData.hourly_rate || 25);
      const overtimeRate = hourlyRate * 1.5;

      // Time entries for this employee
      const empTimeEntries = timeEntries.filter(e => 
        e.employee_email === empEmail || (emp.user_id && e.user_id === emp.user_id)
      );
      const empDrivingLogs = drivingLogs.filter(d => 
        d.employee_email === empEmail || (emp.user_id && d.user_id === emp.user_id)
      );
      const empExpenses = expenses.filter(ex => 
        ex.employee_email === empEmail || (emp.user_id && ex.user_id === emp.user_id)
      );

      const totalHours = empTimeEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
      const normalHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);
      const drivingHours = empDrivingLogs.reduce((s, d) => s + (d.hours || 0), 0);
      const drivingMiles = empDrivingLogs.reduce((s, d) => s + (d.miles || 0), 0);

      const workPay = (normalHours * hourlyRate) + (overtimeHours * overtimeRate);
      const drivingPay = (drivingHours * hourlyRate) + (drivingMiles * 0.70);
      const perDiemAmount = empExpenses.filter(e => e.category === 'per_diem').reduce((s, e) => s + (e.amount || 0), 0);
      const reimbursements = empExpenses.filter(e => e.payment_method === 'personal' && e.category !== 'per_diem').reduce((s, e) => s + (e.amount || 0), 0);
      const bonusAmount = 0;
      const totalPay = workPay + drivingPay + perDiemAmount + reimbursements;
      const workDaysCount = new Set(empTimeEntries.map(e => e.date)).size;

      // Skip employees with zero hours AND zero pay
      if (totalHours === 0 && drivingHours === 0 && drivingMiles === 0 && perDiemAmount === 0 && reimbursements === 0) return null;

      return {
        employee: {
          id: emp.user_id || emp.id,
          full_name: emp.full_name,
          email: empEmail,
          position: emp.position,
          profile_photo_url: emp.profile_photo_url,
          avatar_image_url: userData.avatar_image_url,
          preferred_profile_image: userData.preferred_profile_image,
        },
        normalHours,
        overtimeHours,
        drivingHours,
        drivingMiles,
        workDaysCount,
        perDiemAmount,
        workPay,
        drivingPay,
        reimbursements,
        bonusAmount,
        totalPay,
        hourlyRate,
        overtimeRate,
        pendingReimbursements: 0,
        weekPayroll: null,
      };
    }).filter(Boolean);
  }, [allEmployees, timeEntries, drivingLogs, expenses, users]);

  // PERFORMANCE: Data already aggregated by backend
  // No client-side filtering needed

  // IMPROVED: Better contrast for status badges
  const statusConfig = {
    draft: { label: t('draft'), color: 'bg-slate-200 text-slate-800 border-slate-300' },
    submitted: { label: t('pending'), color: 'bg-amber-100 text-amber-800 border-amber-300' },
    approved: { label: t('approved'), color: 'bg-green-100 text-green-800 border-green-300' },
    rejected: { label: t('rejected'), color: 'bg-red-100 text-red-800 border-red-300' },
    paid: { label: t('paid'), color: 'bg-blue-100 text-blue-800 border-blue-300' }
  };

  // PERFORMANCE: Use backend-aggregated data (no client filtering)

  // PERFORMANCE: Memoize filtered payroll
  const filteredPayrollData = useMemo(() =>
    (payrollData || []).filter((p) =>
      p.employee.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employee.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [payrollData, searchQuery]
  );

  // PERFORMANCE: Memoize totals calculation
  const totals = useMemo(() => ({
    normalHours: filteredPayrollData.reduce((sum, p) => sum + p.normalHours, 0),
    overtimeHours: filteredPayrollData.reduce((sum, p) => sum + p.overtimeHours, 0),
    drivingHours: filteredPayrollData.reduce((sum, p) => sum + p.drivingHours, 0),
    perDiemAmount: filteredPayrollData.reduce((sum, p) => sum + p.perDiemAmount, 0),
    bonusAmount: filteredPayrollData.reduce((sum, p) => sum + p.bonusAmount, 0),
    workPay: filteredPayrollData.reduce((sum, p) => sum + p.workPay, 0),
    drivingPay: filteredPayrollData.reduce((sum, p) => sum + p.drivingPay, 0),
    reimbursements: filteredPayrollData.reduce((sum, p) => sum + p.reimbursements, 0),
    pendingReimbursements: filteredPayrollData.reduce((sum, p) => sum + (p.pendingReimbursements || 0), 0),
    totalPay: filteredPayrollData.reduce((sum, p) => sum + p.totalPay, 0)
  }), [filteredPayrollData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExport = useCallback(() => {
    const csvData = [
      ['Employee', 'Normal Hours', 'Overtime Hours', 'Driving Hours', 'Miles', 'Work Days', 'Per Diem', 'Work Pay', 'Driving Pay', 'Reimbursements', 'Bonus', 'Total Pay', 'Status'], // Added Bonus column
      ...filteredPayrollData.map((p) => {
        const statusLabel = p.weekPayroll ? statusConfig[p.weekPayroll.status]?.label : statusConfig.draft.label;
        return [
          p.employee.full_name,
          p.normalHours.toFixed(2),
          p.overtimeHours.toFixed(2),
          p.drivingHours.toFixed(2),
          p.drivingMiles.toFixed(1),
          p.workDaysCount,
          p.perDiemAmount.toFixed(2),
          p.workPay.toFixed(2),
          p.drivingPay.toFixed(2),
          p.reimbursements.toFixed(2),
          p.bonusAmount.toFixed(2), // NEW
          p.totalPay.toFixed(2),
          statusLabel
        ]
      })
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}.csv`;
    a.click();
  }, [filteredPayrollData, weekStart, weekEnd, statusConfig, t]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('payroll')}
          icon={Banknote}
          actions={
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button onClick={handleExport} variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 min-h-[44px] flex-1 sm:flex-none">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('export')}</span>
              </Button>
              <Button onClick={handlePrint} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px] flex-1 sm:flex-none">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('printPayroll')}</span>
                <span className="sm:hidden">{language === 'es' ? 'Imprimir' : 'Print'}</span>
              </Button>
            </div>
          }
        />

        <div className="mb-6">
          <DateRangeFilter 
            onDateRangeChange={setDateRange}
            defaultRange="this_month"
          />
        </div>



        {payrollLoading ? (
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl mb-6 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-[#507DB4] mx-auto mb-4 animate-spin" />
              <p className="text-slate-600 dark:text-slate-400">
                {language === 'es' ? 'Calculando nómina...' : 'Calculating payroll...'}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <StatsSummaryGrid 
          stats={[
            { label: t('totalWorkPay'), value: `$${totals.workPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Briefcase, subtitle: `${totals.normalHours.toFixed(1)}h + ${totals.overtimeHours.toFixed(1)}h OT` },
            { label: t('totalDrivingPay'), value: `$${totals.drivingPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Car, subtitle: `${totals.drivingHours.toFixed(1)}h driving` },
            { label: t('perDiem'), value: `$${totals.perDiemAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign },
            { label: t('totalReimbursements'), value: `$${totals.reimbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Download, subtitle: totals.pendingReimbursements > 0 ? `⚠️ $${totals.pendingReimbursements.toFixed(2)} pending` : undefined },
            { label: language === 'es' ? 'Bonos' : 'Bonuses', value: `$${totals.bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Gift, subtitle: language === 'es' ? 'Trabajos completados' : 'Completed jobs' },
            { label: t('totalPayroll'), value: `$${totals.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Banknote, gradient: 'soft-cyan-gradient' }
          ]}
        />

        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl mb-6 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder={language === 'es' ? 'Buscar empleado...' : 'Search employee...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-3 md:gap-4">
          {filteredPayrollData.map(({ employee, normalHours, overtimeHours, drivingHours, drivingMiles, perDiemAmount, workDaysCount, workPay, drivingPay, reimbursements, bonusAmount, totalPay, hourlyRate, overtimeRate, weekPayroll }) => {
            const config = weekPayroll ? statusConfig[weekPayroll.status] : statusConfig.draft;
            
            return (
              <Card key={employee.id} className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {employee.profile_photo_url || employee.avatar_image_url ? (
                        <img
                          src={employee.preferred_profile_image === 'avatar' && employee.avatar_image_url 
                            ? employee.avatar_image_url 
                            : employee.profile_photo_url}
                          alt={employee.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#3B9FF3]/30"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                          {employee.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{employee.full_name}</h3>
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{employee.position || t('employee')} • ${hourlyRate}/hr (OT: ${overtimeRate}/hr)</p>
                        <div className="flex gap-3 mt-3 flex-wrap">
                          <Badge className="badge-soft-blue">
                            {normalHours.toFixed(1)}h {language === 'es' ? 'normal' : 'normal'}
                          </Badge>
                          {overtimeHours > 0 && (
                            <Badge className="badge-soft-amber">
                              {overtimeHours.toFixed(1)}h OT
                            </Badge>
                          )}
                          <Badge className="badge-soft-green">
                            {drivingHours.toFixed(1)}h {language === 'es' ? 'manejo' : 'driving'}
                          </Badge>
                          {perDiemAmount > 0 && (
                            <Badge className="badge-soft-slate">
                              ${perDiemAmount.toFixed(2)} Per Diem ({workDaysCount}d)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('totalPay')}</p>
                        <p className="text-3xl font-bold text-[#507DB4] dark:text-[#6B9DD8]">
                          ${totalPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                          <div className="flex justify-between gap-4">
                            <span>{language === 'es' ? 'Trabajo' : 'Work'}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">${workPay.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>{language === 'es' ? 'Manejo' : 'Driving'}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">${drivingPay.toFixed(2)}</span>
                          </div>
                          {reimbursements > 0 && (
                            <div className="flex justify-between gap-4">
                              <span>{t('reimbursements')}:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">${reimbursements.toFixed(2)}</span>
                            </div>
                          )}
                          {/* NEW: Prompt #60 - Show bonus amount */}
                          {bonusAmount > 0 && (
                            <div className="flex justify-between gap-4">
                              <span className="text-rose-600 dark:text-rose-400">{language === 'es' ? '🎯 Bono' : '🎯 Bonus'}:</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">${bonusAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedEmployee(employee)}
                          className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('viewDetails')}
                        </Button>
                        <Button
                          onClick={() => {
                            setPaystubEmployee({ 
                              ...employee, 
                              normalHours, 
                              overtimeHours, 
                              drivingHours, 
                              drivingMiles, 
                              perDiemAmount, 
                              workDaysCount, 
                              workPay, 
                              drivingPay, 
                              reimbursements, 
                              bonusAmount, 
                              totalPay 
                            });
                            setShowPaystub(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="soft-green-bg"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Paystub
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
              <User className="w-6 h-6" />
              {selectedEmployee?.full_name} - {t('payroll')} {t('details')}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeePayrollDetail
              employee={selectedEmployee}
              initialWeekStart={weekStart}
              initialWeekEnd={weekEnd}
              onClose={() => setSelectedEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Paystub Generator Dialog */}
      {paystubEmployee && (
        <PaystubGenerator
          open={showPaystub}
          onOpenChange={setShowPaystub}
          payrollData={paystubEmployee}
          weekStart={format(weekStart, 'yyyy-MM-dd')}
          weekEnd={format(weekEnd, 'yyyy-MM-dd')}
        />
      )}
    </div>
  );
}