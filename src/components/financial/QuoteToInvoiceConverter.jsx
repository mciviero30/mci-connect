import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Loader2, FileText, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function QuoteToInvoiceConverter({ quote, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [sendEmail, setSendEmail] = useState(true);

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Create invoice from quote
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      const invoice = {
        invoice_number: invoiceNumber,
        quote_id: quote.id,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        job_name: quote.job_name,
        job_id: quote.job_id,
        job_address: quote.job_address,
        team_id: quote.team_id,
        team_name: quote.team_name,
        invoice_date: invoiceDate,
        due_date: dueDate,
        items: quote.items,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        amount_paid: 0,
        balance: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        status: 'sent'
      };

      const newInvoice = await base44.entities.Invoice.create(invoice);

      // Update quote status
      await base44.entities.Quote.update(quote.id, {
        status: 'converted_to_invoice',
        invoice_id: newInvoice.id
      });

      // Send email to customer if requested
      if (sendEmail && quote.customer_email) {
        await base44.integrations.Core.SendEmail({
          to: quote.customer_email,
          subject: `Invoice ${invoiceNumber} from MCI Connect`,
          body: `
            Dear ${quote.customer_name},

            Thank you for accepting our quote. Please find your invoice attached.

            Invoice Number: ${invoiceNumber}
            Amount Due: $${invoice.total}
            Due Date: ${format(new Date(dueDate), 'MMM dd, yyyy')}

            Job: ${invoice.job_name}
            ${invoice.job_address ? `Location: ${invoice.job_address}` : ''}

            Please remit payment by the due date.

            Best regards,
            MCI Connect Team
          `
        });
      }

      return newInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onOpenChange(false);
    }
  });

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-blue-600" />
            Convert Quote to Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Quote #{quote.quote_number}</p>
                <p className="font-semibold text-blue-900 dark:text-blue-100">{quote.customer_name}</p>
              </div>
              <Badge className="bg-blue-600 text-white">
                ${quote.total}
              </Badge>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>{quote.job_name}</p>
              <p>{quote.items?.length || 0} items</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-8 h-8 text-slate-400" />
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-900 dark:text-white">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-slate-900 dark:text-white">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4"
              />
              <Label className="text-slate-900 dark:text-white">
                Send invoice email to {quote.customer_email}
              </Label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-900 dark:text-green-100">Ready to Convert</p>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              This will create a new invoice and mark the quote as converted.
              {sendEmail && ' An email will be sent to the customer.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Convert & {sendEmail ? 'Send' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}