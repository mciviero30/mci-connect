import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";

export default function CreateJobFromInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  user,
  isLoading,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    // Job fields
    job_name: invoice?.job_name || '',
    customer_id: invoice?.customer_id || '',
    customer_name: invoice?.customer_name || '',
    
    // Work Authorization fields (auto-created)
    authorization_type: invoice?.billing_type === 'tm' ? 'tm' : 'fixed',
    approval_source: 'signed_quote',
    authorization_number: invoice?.invoice_number || '',
    approved_amount: invoice?.total || 0,
    verified_by_user_id: user?.id || '',
    verified_by_email: user?.email || '',
    verified_by_name: user?.full_name || '',
    verification_notes: `Auto-created from Invoice ${invoice?.invoice_number}`,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.job_name) {
      alert('Job name is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-900 dark:text-white">
            Create Job & Authorization
          </DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Both will be created together. Job will be "Pending Acceptance" until you approve it.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Job will be created with status <strong>"Pending Acceptance"</strong>. Click "Accept & Send to Field" in Jobs to make it live.
            </p>
          </div>

          {/* Customer & Job - Read Only */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Customer</Label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice?.customer_name}</p>
            </div>

            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Invoice</Label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice?.invoice_number}</p>
            </div>
          </div>

          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="job-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Job Name *
            </Label>
            <Input
              id="job-name"
              value={formData.job_name}
              onChange={(e) => setFormData({...formData, job_name: e.target.value})}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              placeholder="e.g., Hilton Hotel - Wall Installation"
            />
          </div>

          {/* Authorization Type */}
          <div className="space-y-2">
            <Label htmlFor="auth-type" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Authorization Type *
            </Label>
            <Select value={formData.authorization_type} onValueChange={(value) => setFormData({...formData, authorization_type: value})}>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="tm">Time & Materials</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approval Source */}
          <div className="space-y-2">
            <Label htmlFor="source" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              How was it approved? *
            </Label>
            <Select value={formData.approval_source} onValueChange={(value) => setFormData({...formData, approval_source: value})}>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="po">Purchase Order (PO)</SelectItem>
                <SelectItem value="verbal">Verbal Agreement</SelectItem>
                <SelectItem value="signed_quote">Signed Quote</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Approved Amount ($) *
            </Label>
            <Input
              id="amount"
              type="number"
              value={formData.approved_amount}
              onChange={(e) => setFormData({...formData, approved_amount: parseFloat(e.target.value) || 0})}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              placeholder="Enter amount"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Job'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}