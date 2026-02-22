import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AutoPayrollCalculator({ employeeEmail, weekStart, weekEnd, onGeneratePaystub }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch time entries for this week
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', employeeEmail, weekStart, weekEnd],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({
        employee_email: employeeEmail,
      });
      
      // Filter by date range
      return entries.filter(entry => {
        const entryDate = entry.date;
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
    },
    enabled: !!employeeEmail,
  });

  // Fetch expenses for this week
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', employeeEmail, weekStart, weekEnd],
    queryFn: async () => {
      const exp = await base44.entities.Expense.filter({
        employee_email: employeeEmail,
      });

      return exp.filter(e => {
        const expDate = e.date;
        return expDate >= weekStart && expDate <= weekEnd;
      });
    },
    enabled: !!employeeEmail,
  });

  // Fetch driving logs
  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['driving-logs', employeeEmail, weekStart, weekEnd],
    queryFn: async () => {
      const logs = await base44.entities.DrivingLog.filter({
        employee_email: employeeEmail,
      });

      return logs.filter(log => {
        const logDate = log.date;
        return logDate >= weekStart && logDate <= weekEnd;
      });
    },
    enabled: !!employeeEmail,
  });

  // Fetch employee to get hourly rates
  const { data: employee } = useQuery({
    queryKey: ['employee-rates', employeeEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: employeeEmail });
      return users[0];
    },
    enabled: !!employeeEmail,
  });

  // Calculate payroll summary
  const payrollSummary = useMemo(() => {
    if (!employee) return null;

    const regularHours = timeEntries
      .filter(t => t.hour_type === 'normal')
      .reduce((sum, t) => sum + (t.hours_worked || 0), 0);

    const overtimeHours = timeEntries
      .filter(t => t.hour_type === 'overtime')
      .reduce((sum, t) => sum + (t.hours_worked || 0), 0);

    const regularRate = employee.hourly_rate || 60;
    const overtimeRate = employee.overtime_rate || regularRate * 1.5;

    const regularPay = regularHours * regularRate;
    const overtimePay = overtimeHours * overtimeRate;

    // Approved expenses only
    const approvedExpenses = expenses
      .filter(e => e.status === 'approved' && e.payment_method === 'personal')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Mileage reimbursement
    const mileageReimbursement = drivingLogs
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + (d.total_amount || 0), 0);

    const subtotal = regularPay + overtimePay + approvedExpenses + mileageReimbursement;
    const taxRate = 0.15; // Simplified tax rate
    const taxes = subtotal * taxRate;
    const totalDue = subtotal - taxes;

    return {
      regularHours,
      overtimeHours,
      regularRate,
      overtimeRate,
      regularPay,
      overtimePay,
      approvedExpenses,
      mileageReimbursement,
      subtotal,
      taxes,
      totalDue,
      itemCount: timeEntries.length + expenses.filter(e => e.status === 'approved').length + drivingLogs.filter(d => d.status === 'approved').length,
    };
  }, [timeEntries, expenses, drivingLogs, employee]);

  if (!payrollSummary) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">Regular Hours</p>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{payrollSummary.regularHours}h</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">Overtime</p>
          <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{payrollSummary.overtimeHours}h</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Reimbursements</p>
          <p className="text-xl font-bold text-green-900 dark:text-green-100">${(payrollSummary.approvedExpenses + payrollSummary.mileageReimbursement).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">Total Items</p>
          <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{payrollSummary.itemCount}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg p-3 border-2 border-slate-900 dark:border-slate-600">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">TOTAL DUE</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">${payrollSummary.totalDue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <Card className="bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 dark:text-slate-400">{payrollSummary.regularHours}h @ ${payrollSummary.regularRate}/h</p>
                <p className="font-bold text-slate-900 dark:text-white">${payrollSummary.regularPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
              </div>
              {payrollSummary.overtimeHours > 0 && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">{payrollSummary.overtimeHours}h OT @ ${payrollSummary.overtimeRate}/h</p>
                  <p className="font-bold text-slate-900 dark:text-white">${payrollSummary.overtimePay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                </div>
              )}
              {payrollSummary.approvedExpenses > 0 && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Expenses Reimbursed</p>
                  <p className="font-bold text-green-600 dark:text-green-400">+${payrollSummary.approvedExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                </div>
              )}
              {payrollSummary.mileageReimbursement > 0 && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Mileage</p>
                  <p className="font-bold text-green-600 dark:text-green-400">+${payrollSummary.mileageReimbursement.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-300 dark:border-slate-600 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">${payrollSummary.subtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Taxes (15%):</span>
                <span className="font-semibold text-red-600 dark:text-red-400">-${payrollSummary.taxes.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 dark:border-slate-600 pt-2">
                <span className="font-bold text-slate-900 dark:text-white">Total Due:</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">${payrollSummary.totalDue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle and Actions */}
      <div className="flex gap-2 justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-700 dark:text-slate-300"
        >
          {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
        </Button>
        <Button
          onClick={() => onGeneratePaystub?.(payrollSummary)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate Paystub
        </Button>
      </div>
    </div>
  );
}