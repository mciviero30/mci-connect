import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function ApprovePayrollButton({ payroll }) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.WeeklyPayroll.update(payroll.id, {
        status: 'approved',
        approved_by_email: user.email,
        approved_by_name: user.full_name,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPayrolls'] });
      alert('✅ Payroll approved!');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.WeeklyPayroll.update(payroll.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by_email: user.email,
        approved_by_name: user.full_name,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPayrolls'] });
      setShowRejectDialog(false);
      setRejectionReason('');
      alert('✅ Payroll rejected. Employee will be notified.');
    }
  });

  const isAdmin = user?.role === 'admin';
  const canApprove = payroll.status === 'submitted';

  if (!isAdmin || !canApprove) return null;

  return (
    <>
      <div className="flex gap-2">
        <Button 
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
          className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-600"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approve
        </Button>
        <Button 
          onClick={() => setShowRejectDialog(true)}
          variant="outline"
          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Reject Payroll
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Reject {payroll.employee_name}'s payroll for {format(new Date(payroll.week_start), 'MMM d')} - {format(new Date(payroll.week_end), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="text-slate-300">Reason for Rejection *</Label>
            <Textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this payroll is being rejected..."
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              rows={4}
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              The employee will see this reason and can resubmit after making corrections.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}