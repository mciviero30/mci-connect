import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Car, Receipt, Award, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { startOfWeek, endOfWeek, parseISO, isWithinInterval, differenceInMinutes } from 'date-fns';

export default function AutoPayrollCalculator({ employeeEmail, weekStart, weekEnd }) {
  // Fetch all payment sources
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', employeeEmail, weekStart],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({ 
        employee_email: employeeEmail,
        status: 'approved'
      });
      return entries.filter(e => {
        if (!e.date) return false;
        const entryDate = parseISO(e.date);
        return isWithinInterval(entryDate, { start: parseISO(weekStart), end: parseISO(weekEnd) });
      });
    },
    enabled: !!employeeEmail && !!weekStart
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['driving-logs', employeeEmail, weekStart],
    queryFn: async () => {
      const logs = await base44.entities.DrivingLog.filter({ 
        employee_email: employeeEmail,
        status: 'approved'
      });
      return logs.filter(e => {
        if (!e.date) return false;
        const entryDate = parseISO(e.date);
        return isWithinInterval(entryDate, { start: parseISO(weekStart), end: parseISO(weekEnd) });
      });
    },
    enabled: !!employeeEmail && !!weekStart
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', employeeEmail, weekStart],
    queryFn: async () => {
      const exps = await base44.entities.Expense.filter({ 
        employee_email: employeeEmail,
        status: 'approved',
        payment_method: 'personal'
      });
      return exps.filter(e => {
        if (!e.date) return false;
        const entryDate = parseISO(e.date);
        return isWithinInterval(entryDate, { start: parseISO(weekStart), end: parseISO(weekEnd) });
      });
    },
    enabled: !!employeeEmail && !!weekStart
  });

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: employeeEmail });
      return users[0];
    },
    enabled: !!employeeEmail
  });

  // Calculate payroll breakdown
  const payrollData = useMemo(() => {
    if (!employee?.hourly_rate) return null;

    const hourlyRate = parseFloat(employee.hourly_rate);
    const overtimeRate = hourlyRate * 1.5;

    // Calculate regular and overtime hours
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalDrivingHours = 0;

    // Group by week to calculate overtime correctly
    const weeklyHours = {};
    
    timeEntries.forEach(entry => {
      if (!entry.date || !entry.hours_worked) return;
      
      const weekKey = startOfWeek(parseISO(entry.date)).toISOString();
      if (!weeklyHours[weekKey]) weeklyHours[weekKey] = 0;
      
      const hours = parseFloat(entry.hours_worked);
      weeklyHours[weekKey] += hours;
    });

    // Split into regular/overtime
    Object.values(weeklyHours).forEach(weekHours => {
      if (weekHours <= 40) {
        totalRegularHours += weekHours;
      } else {
        totalRegularHours += 40;
        totalOvertimeHours += (weekHours - 40);
      }
    });

    // Driving hours (paid at regular rate, no OT)
    drivingLogs.forEach(log => {
      if (log.hours) totalDrivingHours += parseFloat(log.hours);
    });

    // Calculate pay components
    const regularPay = totalRegularHours * hourlyRate;
    const overtimePay = totalOvertimeHours * overtimeRate;
    const drivingPay = totalDrivingHours * hourlyRate;

    // Mileage reimbursement
    const mileageTotal = drivingLogs.reduce((sum, log) => {
      return sum + (log.total_amount || 0);
    }, 0);

    // Expense reimbursements
    const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Total gross pay
    const grossPay = regularPay + overtimePay + drivingPay + mileageTotal + expenseTotal;

    return {
      employee,
      hourlyRate,
      overtimeRate,
      totalRegularHours: totalRegularHours.toFixed(2),
      totalOvertimeHours: totalOvertimeHours.toFixed(2),
      totalDrivingHours: totalDrivingHours.toFixed(2),
      regularPay: regularPay.toFixed(2),
      overtimePay: overtimePay.toFixed(2),
      drivingPay: drivingPay.toFixed(2),
      mileageTotal: mileageTotal.toFixed(2),
      expenseTotal: expenseTotal.toFixed(2),
      grossPay: grossPay.toFixed(2),
      mileageCount: drivingLogs.length,
      expenseCount: expenses.length,
      hasOvertime: totalOvertimeHours > 0
    };
  }, [timeEntries, drivingLogs, expenses, employee]);

  if (!payrollData) {
    return (
      <Card className="bg-white dark:bg-slate-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No hourly rate set for this employee</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <DollarSign className="w-5 h-5" />
            Total Gross Pay
            {payrollData.hasOvertime && (
              <Badge className="bg-orange-500 text-white">OT Included</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100">
            ${payrollData.grossPay}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {payrollData.employee.full_name} • ${payrollData.hourlyRate}/hr
          </p>
        </CardContent>
      </Card>

      {/* Breakdown Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Regular Hours */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Regular Hours</CardTitle>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{payrollData.totalRegularHours} hrs</p>
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">${payrollData.regularPay}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">${payrollData.hourlyRate}/hr</p>
          </CardContent>
        </Card>

        {/* Overtime Hours */}
        {payrollData.hasOvertime && (
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Overtime (1.5x)</CardTitle>
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{payrollData.totalOvertimeHours} hrs</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 font-semibold mt-1">${payrollData.overtimePay}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">${payrollData.overtimeRate}/hr</p>
            </CardContent>
          </Card>
        )}

        {/* Driving Hours */}
        {parseFloat(payrollData.totalDrivingHours) > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Driving Hours</CardTitle>
                <Car className="w-4 h-4 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{payrollData.totalDrivingHours} hrs</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">${payrollData.drivingPay}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No OT applied</p>
            </CardContent>
          </Card>
        )}

        {/* Mileage */}
        {payrollData.mileageCount > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Mileage</CardTitle>
                <Car className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{payrollData.mileageCount} trips</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">${payrollData.mileageTotal}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$0.60/mile</p>
            </CardContent>
          </Card>
        )}

        {/* Expenses */}
        {payrollData.expenseCount > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Reimbursements</CardTitle>
                <Receipt className="w-4 h-4 text-pink-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{payrollData.expenseCount} items</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">${payrollData.expenseTotal}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Approved expenses</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}