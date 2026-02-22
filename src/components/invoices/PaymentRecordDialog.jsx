import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function PaymentRecordDialog({
  open,
  onOpenChange,
  invoice,
  paymentAmount,
  onPaymentAmountChange,
  onSubmit,
  isLoading
}) {
  const { t } = useLanguage();

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{t('recordPayment')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-slate-600">{t('balanceDue')}</p>
            <p className="text-2xl font-bold text-amber-700">
              ${((Number(invoice?.balance) || Number(invoice?.total) || 0)).toFixed(2)}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">{t('paymentAmount')}</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              max={invoice.balance || invoice.total}
              className="bg-slate-50 border-slate-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-300">
            {t('cancel')}
          </Button>
          <Button
            onClick={() => onSubmit(parseFloat(paymentAmount))}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isLoading}
            className="soft-green-gradient"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isLoading ? t('processing') : t('confirmPayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}