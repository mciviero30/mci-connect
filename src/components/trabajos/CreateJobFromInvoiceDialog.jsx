import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function CreateJobFromInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  user,
  isLoading,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    authorization_type: 'fixed',
    approval_source: 'signed_quote',
    approved_amount: invoice?.total || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-900 dark:text-white">
            Create Job Authorization
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Info - Read Only */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Customer</Label>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice?.customer_name}</p>
          </div>

          {/* Job Info - Read Only */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Job</Label>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice?.job_name}</p>
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