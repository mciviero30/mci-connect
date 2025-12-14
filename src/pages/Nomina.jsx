import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Download, Search, Edit, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import StatsCard from "../components/shared/StatsCard";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmployeePayrollDetail from "../components/nomina/EmployeePayrollDetail";
import DateRangeFilter from "../components/reportes/DateRangeFilter";

export default function Nomina() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // NEW: Date range state (default to current month)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end, preset: 'this_month' };
  });

  const weekStart = dateRange.start;
  const weekEnd = dateRange.end;

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error loading employees:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: async () => {
      try {
        return await base44.entities.TimeEntry.list();
      } catch (error) {
        console.error('Error loading time entries:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['drivingLogs'],
    queryFn: async () => {
      try {
        return await base44.entities.DrivingLog.list();
      } catch (error) {
        console.error('Error loading driving logs:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      try {
        return await base44.entities.Expense.list();
      } catch (error) {
        console.error('Error loading expenses:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: weeklyPayrolls = [] } = useQuery({
    queryKey: ['weeklyPayrolls'],
    queryFn: async () => {
      try {
        return await base44.entities.WeeklyPayroll.list('-created_date');
      } catch (error) {
        console.error('Error loading payrolls:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // NEW: Prompt #60 - Query bonus configurations
  const { data: bonusConfigurations = [] } = useQuery({
    queryKey: ['bonusConfigurations'],
    queryFn: async () => {
      try {
        return await base44.entities.BonusConfiguration.filter({ status: 'active' });
      } catch (error) {
        console.error('Error loading bonus configs:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // NEW: Prompt #60 - Query jobs to check invoice status
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        return await base44.entities.Job.list();
      } catch (error) {
        console.error('Error loading jobs:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        return await base44.entities.Invoice.list();
      } catch (error) {
        console.error('Error loading invoices:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const activeEmployees = employees.filter((emp) => !emp.employment_status || emp.employment_status === 'active');

  const getEmployeePayroll = (employee) => {
    // FILTER BY APPROVED STATUS ONLY
    const weekTimeEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entry.employee_email === employee.email &&
      entry.status === 'approved' &&
      entryDate >= weekStart &&
      entryDate <= weekEnd;
    });

    const weekDrivingLogs = drivingLogs.filter((log) => {
      const logDate = new Date(log.date);
      return log.employee_email === employee.email &&
      log.status === 'approved' &&
      logDate >= weekStart &&
      logDate <= weekEnd;
    });

    const weekExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return exp.employee_email === employee.email &&
      exp.status === 'approved' &&
      expDate >= weekStart &&
      expDate <= weekEnd;
    });

    // WORK HOURS ONLY (NOT driving hours) - for OT calculation
    const totalWorkHours = weekTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const normalHours = Math.min(totalWorkHours, 40);
    const overtimeHours = Math.max(0, totalWorkHours - 40);

    // DRIVING: hours paid at normal rate, miles at $0.60/mi
    const drivingHours = weekDrivingLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const drivingMiles = weekDrivingLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    
    // NEW: Use employee's configured rates
    const hourlyRate = employee.hourly_rate || 25;
    const overtimeRate = employee.hourly_rate_overtime || (hourlyRate * 1.5);
    const perDiemDaily = employee.per_diem_amount || 50;
    
    const mileagePay = drivingMiles * 0.60;
    const drivingHoursPay = drivingHours * hourlyRate;
    const totalDrivingPay = mileagePay + drivingHoursPay;

    // PER DIEM - NEW: Calculate based on actual work days
    const workDaysSet = new Set();
    weekTimeEntries.forEach(entry => workDaysSet.add(entry.date));
    const workDaysCount = workDaysSet.size;
    const perDiemAmount = workDaysCount * perDiemDaily;

    // REIMBURSABLE EXPENSES (personal payment, not per diem)
    const reimbursements = weekExpenses
      .filter((exp) => exp.payment_method === 'personal' && exp.category !== 'per_diem')
      .reduce((sum, exp) => sum + exp.amount, 0);

    // NEW: Prompt #60 - Calculate bonuses for completed and paid jobs
    let bonusAmount = 0;
    const employeeBonuses = bonusConfigurations.filter(bc => 
      bc.employee_email === employee.email && bc.status === 'active'
    );

    for (const bonusConfig of employeeBonuses) {
      // Check if job has a paid invoice
      const job = jobs.find(j => j.id === bonusConfig.job_id);
      const jobInvoice = invoices.find(inv => inv.job_id === bonusConfig.job_id && inv.status === 'paid');
      
      if (job && jobInvoice) {
        if (bonusConfig.bonus_type === 'percentage') {
          // Percentage of contract amount
          bonusAmount += (job.contract_amount || 0) * (bonusConfig.bonus_value / 100);
        } else if (bonusConfig.bonus_type === 'fixed_amount') {
          // Fixed amount
          bonusAmount += bonusConfig.bonus_value;
        }
      }
    }

    // NEW: Use configured rates for work pay calculation
    const workPay = (normalHours * hourlyRate) + (overtimeHours * overtimeRate);
    const totalPay = workPay + totalDrivingPay + reimbursements + perDiemAmount + bonusAmount; // NEW: Added bonusAmount

    return {
      normalHours,
      overtimeHours,
      drivingHours,
      drivingMiles,
      perDiemAmount,
      workDaysCount,
      workPay,
      drivingPay: totalDrivingPay,
      reimbursements,
      bonusAmount, // NEW
      totalPay,
      hourlyRate,
      overtimeRate
    };
  };

  const getEmployeeWeekPayroll = (employee) => {
    return weeklyPayrolls.find(p => 
      p.employee_email === employee.email &&
      p.week_start === format(weekStart, 'yyyy-MM-dd') &&
      p.week_end === format(weekEnd, 'yyyy-MM-dd')
    );
  };

  // IMPROVED: Better contrast for status badges
  const statusConfig = {
    draft: { label: t('draft'), color: 'bg-slate-200 text-slate-800 border-slate-300' },
    submitted: { label: t('pending'), color: 'bg-amber-100 text-amber-800 border-amber-300' },
    approved: { label: t('approved'), color: 'bg-green-100 text-green-800 border-green-300' },
    rejected: { label: t('rejected'), color: 'bg-red-100 text-red-800 border-red-300' },
    paid: { label: t('paid'), color: 'bg-blue-100 text-blue-800 border-blue-300' }
  };

  const payrollData = activeEmployees.map((emp) => ({
    employee: emp,
    ...getEmployeePayroll(emp)
  }));

  const filteredPayrollData = payrollData.filter((p) =>
    p.employee.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employee.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = {
    normalHours: filteredPayrollData.reduce((sum, p) => sum + p.normalHours, 0),
    overtimeHours: filteredPayrollData.reduce((sum, p) => sum + p.overtimeHours, 0),
    drivingHours: filteredPayrollData.reduce((sum, p) => sum + p.drivingHours, 0),
    perDiemAmount: filteredPayrollData.reduce((sum, p) => sum + p.perDiemAmount, 0),
    bonusAmount: filteredPayrollData.reduce((sum, p) => sum + p.bonusAmount, 0), // NEW
    workPay: filteredPayrollData.reduce((sum, p) => sum + p.workPay, 0),
    drivingPay: filteredPayrollData.reduce((sum, p) => sum + p.drivingPay, 0),
    reimbursements: filteredPayrollData.reduce((sum, p) => sum + p.reimbursements, 0),
    totalPay: filteredPayrollData.reduce((sum, p) => sum + p.totalPay, 0)
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvData = [
      ['Employee', 'Normal Hours', 'Overtime Hours', 'Driving Hours', 'Miles', 'Work Days', 'Per Diem', 'Work Pay', 'Driving Pay', 'Reimbursements', 'Bonus', 'Total Pay', 'Status'], // Added Bonus column
      ...filteredPayrollData.map((p) => {
        const weekPayroll = getEmployeeWeekPayroll(p.employee);
        const statusLabel = weekPayroll ? statusConfig[weekPayroll.status]?.label : statusConfig.draft.label;
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
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/30">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{t('payroll')}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <DateRangeFilter 
                    onDateRangeChange={setDateRange}
                    defaultRange="this_month"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" />
                {t('export')}
              </Button>
              <Button onClick={handlePrint} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE2] text-white shadow-lg shadow-blue-500/30">
                <Download className="w-4 h-4 mr-2" />
                {t('printPayroll')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-6 gap-6 mb-8"> {/* Changed from 5 to 6 columns */}
          <StatsCard
            title={t('totalWorkPay')}
            value={`$${totals.workPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={`${totals.normalHours.toFixed(1)}h normal + ${totals.overtimeHours.toFixed(1)}h OT`}
            icon={Banknote}
            color="from-[#3B9FF3] to-[#2A8FE3]"
          />

          <StatsCard
            title={t('totalDrivingPay')}
            value={`$${totals.drivingPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={`${totals.drivingHours.toFixed(1)}h driving`}
            icon={Banknote}
            color="from-green-500 to-emerald-500"
          />

          <StatsCard
            title={t('perDiem')}
            value={`$${totals.perDiemAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={Banknote}
            color="from-amber-500 to-orange-500"
          />

          <StatsCard
            title={t('totalReimbursements')}
            value={`$${totals.reimbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={Banknote}
            color="from-purple-500 to-pink-500"
          />

          {/* NEW: Prompt #60 - Bonus stat card */}
          <StatsCard
            title={language === 'es' ? 'Bonos' : 'Bonuses'}
            value={`$${totals.bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={language === 'es' ? 'De trabajos completados' : 'From completed jobs'}
            icon={Banknote}
            color="from-rose-500 to-fuchsia-500"
          />

          <StatsCard
            title={t('totalPayroll')}
            value={`$${totals.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={Banknote}
            color="from-[#3B9FF3] to-[#2A8FE3]"
          />
        </div>

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

        <div className="grid gap-4">
          {filteredPayrollData.map(({ employee, normalHours, overtimeHours, drivingHours, drivingMiles, perDiemAmount, workDaysCount, workPay, drivingPay, reimbursements, bonusAmount, totalPay, hourlyRate, overtimeRate }) => {
            const weekPayroll = getEmployeeWeekPayroll(employee);
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
                        <div className="w-16 h-16 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
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
                          <Badge className="bg-blue-100 border-blue-300 text-blue-800">
                            {normalHours.toFixed(1)}h {language === 'es' ? 'normal' : 'normal'}
                          </Badge>
                          {overtimeHours > 0 && (
                            <Badge className="bg-amber-100 border-amber-300 text-amber-800">
                              {overtimeHours.toFixed(1)}h OT
                            </Badge>
                          )}
                          <Badge className="bg-green-100 border-green-300 text-green-800">
                            {drivingHours.toFixed(1)}h {language === 'es' ? 'manejo' : 'driving'}
                          </Badge>
                          {perDiemAmount > 0 && (
                            <Badge className="bg-purple-100 border-purple-300 text-purple-800">
                              ${perDiemAmount.toFixed(2)} Per Diem ({workDaysCount}d)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('totalPay')}</p>
                        <p className="text-3xl font-bold text-[#3B9FF3] dark:text-blue-400">
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

                      <Button
                        onClick={() => setSelectedEmployee(employee)}
                        className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('viewDetails')}
                      </Button>
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
    </div>
  );
}