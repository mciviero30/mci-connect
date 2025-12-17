import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function PaystubGenerator({ open, onOpenChange, payrollData, weekStart, weekEnd }) {
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      // This would call a backend function to generate PDF
      // For now, we'll create a simple HTML-based paystub
      const response = await base44.functions.invoke('generatePaystub', {
        employeeEmail: payrollData.employee.email,
        employeeName: payrollData.employee.full_name,
        weekStart,
        weekEnd,
        hourlyRate: payrollData.hourlyRate,
        overtimeRate: payrollData.overtimeRate,
        regularHours: payrollData.totalRegularHours,
        overtimeHours: payrollData.totalOvertimeHours,
        drivingHours: payrollData.totalDrivingHours,
        regularPay: payrollData.regularPay,
        overtimePay: payrollData.overtimePay,
        drivingPay: payrollData.drivingPay,
        mileageTotal: payrollData.mileageTotal,
        expenseTotal: payrollData.expenseTotal,
        grossPay: payrollData.grossPay
      });
      
      return response;
    }
  });

  const handleDownload = async () => {
    try {
      await generatePdfMutation.mutateAsync();
      // Download would happen here
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating paystub:', error);
    }
  };

  if (!payrollData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-blue-600" />
            Paystub Preview
          </DialogTitle>
        </DialogHeader>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-800">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b border-slate-300 dark:border-slate-600">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">MCI Connect</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Pay Period: {format(new Date(weekStart), 'MMM dd')} - {format(new Date(weekEnd), 'MMM dd, yyyy')}</p>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Employee</p>
              <p className="font-semibold text-slate-900 dark:text-white">{payrollData.employee.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Employee ID</p>
              <p className="font-semibold text-slate-900 dark:text-white">{payrollData.employee.email}</p>
            </div>
          </div>

          {/* Earnings */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">Earnings</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-400">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Hours/Qty</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-slate-900 dark:text-white">
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2">Regular Hours</td>
                  <td className="text-right">{payrollData.totalRegularHours}</td>
                  <td className="text-right">${payrollData.hourlyRate}</td>
                  <td className="text-right font-semibold">${payrollData.regularPay}</td>
                </tr>
                {parseFloat(payrollData.totalOvertimeHours) > 0 && (
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2">Overtime (1.5x)</td>
                    <td className="text-right">{payrollData.totalOvertimeHours}</td>
                    <td className="text-right">${payrollData.overtimeRate}</td>
                    <td className="text-right font-semibold">${payrollData.overtimePay}</td>
                  </tr>
                )}
                {parseFloat(payrollData.totalDrivingHours) > 0 && (
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2">Driving Hours</td>
                    <td className="text-right">{payrollData.totalDrivingHours}</td>
                    <td className="text-right">${payrollData.hourlyRate}</td>
                    <td className="text-right font-semibold">${payrollData.drivingPay}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Reimbursements */}
          {(parseFloat(payrollData.mileageTotal) > 0 || parseFloat(payrollData.expenseTotal) > 0) && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">Reimbursements</h3>
              <table className="w-full text-sm">
                <tbody className="text-slate-900 dark:text-white">
                  {parseFloat(payrollData.mileageTotal) > 0 && (
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-2">Mileage</td>
                      <td className="text-right">{payrollData.mileageCount} trips</td>
                      <td className="text-right">$0.60/mi</td>
                      <td className="text-right font-semibold">${payrollData.mileageTotal}</td>
                    </tr>
                  )}
                  {parseFloat(payrollData.expenseTotal) > 0 && (
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-2">Expense Reimbursements</td>
                      <td className="text-right">{payrollData.expenseCount} items</td>
                      <td className="text-right">-</td>
                      <td className="text-right font-semibold">${payrollData.expenseTotal}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white">Total Gross Pay</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">${payrollData.grossPay}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleDownload}
            disabled={generatePdfMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generatePdfMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}