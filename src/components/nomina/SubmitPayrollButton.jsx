import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function SubmitPayrollButton({ employee, weekStart, weekEnd, payrollData, existingPayroll }) {
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // WRITE GUARD — user_id required for new records (legacy tolerated)
      const data = {
        user_id: employee?.id, // NEW: Enforce user_id
        employee_email: employee.email,
        employee_name: employee.full_name,
        week_start_date: format(weekStart, 'yyyy-MM-dd'),
        week_start: format(weekStart, 'yyyy-MM-dd'), // Legacy field
        week_end: format(weekEnd, 'yyyy-MM-dd'),
        regular_hours: payrollData.regularHours || 0,
        overtime_hours: payrollData.overtimeHours || 0,
        driving_hours: payrollData.drivingHours || 0,
        driving_miles: payrollData.drivingMiles || 0,
        per_diem_amount: payrollData.perDiemAmount || 0,
        total_work_pay: payrollData.workPay || 0,
        work_pay: payrollData.workPay || 0, // Legacy field
        driving_pay: payrollData.drivingPay || 0,
        reimbursements: payrollData.reimbursements || 0,
        total_pay: payrollData.totalPay || 0,
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        notes
      };

      if (!existingPayroll && !employee?.id) {
        console.warn('[WRITE GUARD] ⚠️ Creating WeeklyPayroll without user_id', {
          email: employee?.email,
          week: format(weekStart, 'yyyy-MM-dd')
        });
      }

      if (existingPayroll) {
        await base44.entities.WeeklyPayroll.update(existingPayroll.id, data);
      } else {
        await base44.entities.WeeklyPayroll.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPayrolls'] });
      setShowDialog(false);
      setNotes('');
      alert('✅ Payroll submitted for approval!');
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    }
  });

  const isEmployee = user && user.email === employee.email;
  const canSubmit = existingPayroll ? existingPayroll.status === 'draft' || existingPayroll.status === 'rejected' : true;

  if (!isEmployee) return null;

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        disabled={!canSubmit || payrollData.totalPay === 0}
        className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-600"
      >
        <Send className="w-4 h-4 mr-2" />
        {existingPayroll?.status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Submit Payroll for Approval
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit your timesheet for {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="font-semibold text-white mb-3">Week Summary:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Regular Hours:</span>
                  <p className="font-bold text-emerald-400">{payrollData.regularHours?.toFixed(2)}h</p>
                </div>
                <div>
                  <span className="text-slate-400">Overtime Hours:</span>
                  <p className="font-bold text-amber-400">{payrollData.overtimeHours?.toFixed(2)}h</p>
                </div>
                <div>
                  <span className="text-slate-400">Driving Hours:</span>
                  <p className="font-bold text-blue-400">{payrollData.drivingHours?.toFixed(2)}h</p>
                </div>
                <div>
                  <span className="text-slate-400">Per Diem:</span>
                  <p className="font-bold text-purple-400">${payrollData.perDiemAmount?.toFixed(2)}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Total Pay:</span>
                  <p className="text-2xl font-bold text-emerald-400">${payrollData.totalPay?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {existingPayroll?.status === 'rejected' && existingPayroll.rejection_reason && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-400 mb-1">Previous Rejection Reason:</h4>
                    <p className="text-sm text-red-300">{existingPayroll.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for your manager..."
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
            >
              <Check className="w-4 h-4 mr-2" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}