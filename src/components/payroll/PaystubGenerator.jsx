import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PaystubGenerator({ open, onOpenChange, payrollData, weekStart, weekEnd }) {
  const contentRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    const canvas = await html2canvas(contentRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`paystub-${payrollData.employee.full_name}-${weekStart}.pdf`);
  };

  if (!payrollData) return null;

  const { employee, regularHours, overtimeHours, regularRate, overtimeRate, regularPay, overtimePay, approvedExpenses, mileageReimbursement, subtotal, taxes, totalDue } = payrollData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paystub - {employee.full_name}</DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={contentRef} className="p-8 bg-white text-slate-900">
          {/* Header */}
          <div className="mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">PAYSTUB</h1>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-slate-600">Employee Name:</p>
                <p className="font-bold text-lg">{employee.full_name}</p>
                <p className="text-sm text-slate-600 mt-2">Email:</p>
                <p className="font-mono text-sm">{employee.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Pay Period:</p>
                <p className="font-bold text-lg">{weekStart} to {weekEnd}</p>
                <p className="text-sm text-slate-600 mt-2">Position:</p>
                <p className="font-bold">{employee.position || 'Employee'}</p>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">Earnings</h2>
            <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
              {regularHours > 0 && (
                <div className="flex justify-between">
                  <span>Regular Pay ({regularHours}h @ ${regularRate}/h)</span>
                  <span className="font-bold">${regularPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {overtimeHours > 0 && (
                <div className="flex justify-between">
                  <span>Overtime ({overtimeHours}h @ ${overtimeRate}/h)</span>
                  <span className="font-bold">${overtimePay.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {approvedExpenses > 0 && (
                <div className="flex justify-between">
                  <span>Expense Reimbursement</span>
                  <span className="font-bold text-green-600">${approvedExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {mileageReimbursement > 0 && (
                <div className="flex justify-between">
                  <span>Mileage Reimbursement</span>
                  <span className="font-bold text-green-600">${mileageReimbursement.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deductions */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">Deductions</h2>
            <div className="space-y-2 bg-red-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Federal & FICA Taxes (15%)</span>
                <span className="font-bold text-red-600">${taxes.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t-2 border-slate-900 pt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold uppercase">Total Due:</span>
              <span className="text-3xl font-bold text-green-600">${totalDue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-xs text-slate-600 text-right">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}