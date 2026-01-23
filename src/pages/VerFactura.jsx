import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Mail,
  Share2,
  Printer,
  DollarSign,
  CheckCircle,
  Copy,
  Trash2,
  MoreHorizontal,
  XCircle,
  Download,
  ArrowLeft,
  FileText,
  Briefcase,
  CreditCard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeErrorMessage } from "@/components/utils/safeErrorMessage";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InvoiceDocument from "../components/documentos/InvoiceDocument";
import { downloadInvoicePDF } from "../components/pdf/generateInvoicePDF";
import { getInvoiceStatusMeta } from "../components/core/statusConfig";
import RetryProvisioningButton from "../components/invoices/RetryProvisioningButton";

export default function VerFactura() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const { data: rawInvoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => base44.entities.Invoice.get(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: job } = useQuery({
    queryKey: ['job', rawInvoice?.job_id],
    queryFn: () => base44.entities.Job.get(rawInvoice.job_id),
    enabled: !!rawInvoice?.job_id,
  });

  // Defensive normalization - prevent crashes
  const invoice = rawInvoice ? {
    ...rawInvoice,
    invoice_number: rawInvoice?.invoice_number || 'DRAFT',
    customer_name: rawInvoice?.customer_name || 'N/A',
    status: rawInvoice?.status || 'draft',
    total: Number(rawInvoice?.total) || 0,
    subtotal: Number(rawInvoice?.subtotal) || 0,
    tax_amount: Number(rawInvoice?.tax_amount) || 0,
    tax_rate: Number(rawInvoice?.tax_rate) || 0,
    amount_paid: Number(rawInvoice?.amount_paid) || 0,
    balance: Number(rawInvoice?.balance) || Math.max(0, (Number(rawInvoice?.total)||0) - (Number(rawInvoice?.amount_paid)||0)),
    items: Array.isArray(rawInvoice?.items) ? rawInvoice.items : []
  } : null;

  // DEV LOG
  useEffect(() => {
    if (invoice && import.meta.env.DEV) {
      console.log("[Invoice loaded]", invoice.items?.map(i => ({
        item_name: i.item_name,
        description: i.description
      })));
    }
  }, [invoice]);

  const recordPaymentMutation = useMutation({
    mutationFn: async (amount) => {
      const newAmountPaid = (Number(invoice?.amount_paid) || 0) + amount;
      const newBalance = (Number(invoice?.total) || 0) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await base44.entities.Invoice.update(invoiceId, {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payment_date: newStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : invoice.payment_date
      });

      await base44.entities.Transaction.create({
        type: 'income',
        amount: amount,
        category: 'sales',
        description: `Payment for Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'bank_transfer'
      });

      if (invoice?.customer_email) {
        await base44.integrations.Core.SendEmail({
          to: invoice.customer_email,
          subject: `Payment Received - Invoice ${invoice.invoice_number}`,
          body: `Dear ${invoice.customer_name},\n\nWe have received your payment of $${amount.toFixed(2)} for invoice ${invoice.invoice_number}.\n\nNew balance: $${newBalance.toFixed(2)}\n\nThank you for your payment.`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setPaymentDialog(false);
      setPaymentAmount('');
      toast({
        title: 'Payment recorded successfully',
        variant: 'success'
      });
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      const items = Array.isArray(invoice?.items) ? invoice.items : [];
      const itemsList = items.map(item =>
        `${Number(item?.quantity)||0}x ${item?.description||'Item'} - $${(Number(item?.unit_price)||0).toFixed(2)} = $${(Number(item?.total)||0).toFixed(2)}`
      ).join('\n');

      const formatDateSafe = (dateStr) => {
        try {
          return dateStr ? format(new Date(dateStr), 'd MMMM yyyy', { locale: language === 'es' ? es : undefined }) : 'N/A';
        } catch {
          return dateStr || 'N/A';
        }
      };

      await base44.integrations.Core.SendEmail({
        to: invoice.customer_email,
        subject: `Invoice ${invoice.invoice_number} - ${invoice.job_name}`,
        body: `Dear ${invoice.customer_name},\n\nPlease find your invoice for: ${invoice.job_name}\n\nInvoice #: ${invoice.invoice_number}\nDate: ${formatDateSafe(invoice.invoice_date)}\nDue Date: ${formatDateSafe(invoice.due_date)}\n\nITEMS:\n${itemsList}\n\nSubtotal: $${invoice.subtotal.toFixed(2)}\nTax (${invoice.tax_rate}%): $${invoice.tax_amount.toFixed(2)}\nTOTAL: $${invoice.total.toFixed(2)}\n\nAmount Paid: $${(invoice.amount_paid || 0).toFixed(2)}\nBalance Due: $${(invoice.balance || invoice.total).toFixed(2)}\n\nNotes:\n${invoice.notes}\n\nTerms:\n${invoice.terms}\n\nThank you for your business.`
      });

      await base44.entities.Invoice.update(invoiceId, { status: 'sent' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice sent successfully',
        variant: 'success'
      });
    }
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const invoices = await base44.entities.Invoice.list();
      const existingNumbers = invoices
        .map(inv => inv.invoice_number)
        .filter(n => n?.startsWith('INV-'))
        .map(n => parseInt(n.replace('INV-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const new_invoice_number = `INV-${String(nextNumber).padStart(5, '0')}`;

      const clonedInvoice = {
        ...invoice,
        invoice_number: new_invoice_number,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: 'draft',
        amount_paid: 0,
        balance: invoice.total
      };

      delete clonedInvoice.id;
      delete clonedInvoice.created_date;
      delete clonedInvoice.updated_date;
      delete clonedInvoice.created_by;
      delete clonedInvoice.quote_id;
      delete clonedInvoice.payment_date;

      return base44.entities.Invoice.create(clonedInvoice);
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice cloned successfully',
        variant: 'success'
      });
      navigate(createPageUrl(`CrearFactura?id=${newInvoice.id}`));
    }
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: () => base44.entities.Invoice.update(invoiceId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice cancelled',
        variant: 'success'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Invoice.delete(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice deleted successfully',
        variant: 'success'
      });
      navigate(createPageUrl('Facturas'));
    }
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      // Create job from invoice data
      const jobData = {
        name: invoice.job_name,
        description: `Job created from Invoice ${invoice.invoice_number}`,
        customer_id: invoice.customer_id || '',
        customer_name: invoice.customer_name,
        address: invoice.job_address || '',
        contract_amount: invoice.total,
        team_id: invoice.team_id || '',
        team_name: invoice.team_name || '',
        status: 'active',
        color: 'blue',
      };

      const newJob = await base44.entities.Job.create(jobData);

      // Update invoice with job_id
      await base44.entities.Invoice.update(invoiceId, { 
        job_id: newJob.id,
        job_name: newJob.name 
      });

      // Sync to MCI Field
      try {
        await base44.functions.invoke('syncJobToMCIField', { jobData: newJob });
      } catch (err) {
        console.log('Field sync failed (non-critical):', err);
      }

      return newJob;
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: 'Job created and linked to invoice',
        variant: 'success'
      });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      console.log('🔄 Generating Invoice PDF using backend function...');
      const response = await base44.functions.invoke('generateInvoicePDF', { invoiceId: invoice.id });
      console.log('✅ PDF generated, downloading...');
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}-${invoice.customer_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
      
      toast({
        title: 'PDF downloaded successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to generate PDF'),
        variant: 'destructive'
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
          text: `Invoice for ${invoice.customer_name}`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied to clipboard',
        variant: 'success'
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate();
    }
  };

  const handleStripePayment = async () => {
    try {
      // Check if running in iframe
      if (window.self !== window.top) {
        toast({
          title: 'Error',
          description: language === 'es' ? 'Los pagos solo funcionan en la app publicada. Abre la app en una nueva pestaña.' : 'Payments only work in published app. Open app in a new tab.',
          variant: 'destructive'
        });
        return;
      }

      const response = await base44.functions.invoke('stripe-checkout', { invoiceId: invoice.id });
      
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to create payment session'),
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Invoice not found</p>
      </div>
    );
  }

  const statusMeta = getInvoiceStatusMeta(invoice.status, language);
  const canEdit = invoice.status === 'draft';
  const canDelete = invoice.status === 'draft';
  const canRecordPayment = !['paid', 'cancelled'].includes(invoice.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar */}
      <div className="no-print border-b shadow-sm px-6 py-4" style={{background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)', borderColor: 'rgba(0, 0, 0, 0.2)'}}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Facturas'))}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('back')}
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{invoice.invoice_number}</h1>
              <Badge className={`${statusMeta.badgeClass} mt-1`}>{statusMeta.label}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pay Now Button - STRIPE PAYMENTS */}
            {invoice.balance > 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    if (window.self !== window.top) {
                      alert('Payments only work in published app. Please open the app in a new browser tab.');
                      return;
                    }
                    const response = await base44.functions.invoke('stripe-checkout', { invoiceId: invoice.id });
                    if (response?.data?.url) {
                      window.location.href = response.data.url;
                    } else {
                      throw new Error('No checkout URL returned');
                    }
                  } catch (error) {
                    console.error('Payment error:', error);
                    toast({
                      title: 'Error',
                      description: error.message || 'Failed to start payment',
                      variant: 'destructive'
                    });
                  }
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${invoice.balance?.toLocaleString() || '0'}
              </Button>
            )}

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl(`CrearFactura?id=${invoice.id}`))}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoiceMutation.mutate()}
              disabled={sendInvoiceMutation.isPending}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendInvoiceMutation.isPending ? t('sending') : t('sendToCustomer')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadInvoicePDF(invoice)}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'PDF' : 'PDF'}
            </Button>

            {!invoice.job_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createJobMutation.mutate()}
                disabled={createJobMutation.isPending}
                className="bg-blue-800 border-blue-700 text-white hover:bg-blue-700 hover:text-white disabled:opacity-50"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                {createJobMutation.isPending ? (language === 'es' ? 'Creando...' : 'Creating...') : (language === 'es' ? 'Crear Job' : 'Create Job')}
              </Button>
            )}

            {/* Provisioning Status Badge */}
            {job && (
              <div className="flex items-center gap-2">
                {job.provisioning_status === 'completed' && job.drive_folder_url && job.field_project_id && (
                  <Badge className="bg-green-500 text-white">
                    ✓ {language === 'es' ? 'Provisionado' : 'Provisioned'}
                  </Badge>
                )}
                {job.provisioning_status === 'partial' && (
                  <Badge className="bg-amber-500 text-white">
                    ⚠ {language === 'es' ? 'Parcial' : 'Partial'}
                  </Badge>
                )}
                {job.provisioning_status === 'error' && (
                  <Badge className="bg-red-500 text-white">
                    ✗ {language === 'es' ? 'Error' : 'Error'}
                  </Badge>
                )}
                {(!job.provisioning_status || job.provisioning_status === 'not_started' || job.provisioning_status === 'pending') && (
                  <Badge className="bg-slate-500 text-white">
                    {language === 'es' ? 'Pendiente' : 'Pending'}
                  </Badge>
                )}
              </div>
            )}

            {canRecordPayment && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStripePayment}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Pagar Ahora' : 'Pay Now'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPaymentDialog(true)}
                  className="soft-green-gradient shadow-lg"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {t('recordPayment')}
                </Button>
              </>
            )}

            <RetryProvisioningButton 
              invoice={invoice} 
              job={job}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['job', invoice?.job_id] });
                queryClient.invalidateQueries({ queryKey: ['jobs'] });
              }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer text-white hover:bg-slate-800">
                  <Printer className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Imprimir' : 'Print'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer text-white hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Descargar PDF (Backend)' : 'Download PDF (Backend)'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer text-white hover:bg-slate-800">
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('share')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cloneMutation.mutate()} className="cursor-pointer text-white hover:bg-slate-800">
                  <Copy className="w-4 h-4 mr-2" />
                  {t('clone')}
                </DropdownMenuItem>
                {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem onClick={() => cancelInvoiceMutation.mutate()} className="cursor-pointer text-white hover:bg-slate-800">
                      <XCircle className="w-4 h-4 mr-2 text-amber-600" />
                      {t('cancelInvoice')}
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-400 focus:text-red-300 cursor-pointer hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div id="invoice-printable" className="max-w-4xl mx-auto my-8 print:my-0 bg-white shadow-xl print:shadow-none rounded-lg print:rounded-none">
        <InvoiceDocument invoice={invoice} />
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
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
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={invoice.balance || invoice.total}
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)} className="border-slate-300">
              {t('cancel')}
            </Button>
            <Button
              onClick={() => recordPaymentMutation.mutate(parseFloat(paymentAmount))}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || recordPaymentMutation.isPending}
              className="soft-green-gradient"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {recordPaymentMutation.isPending ? t('processing') : t('confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <style>{`
        @media print {
          /* Hide EVERYTHING first */
          * {
            visibility: hidden !important;
          }
          
          /* Hide the entire HTML structure */
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          
          /* Hide sidebars, navigation, dialogs */
          [data-sidebar],
          aside,
          nav,
          header:not(#invoice-printable header),
          .no-print,
          [role="dialog"],
          [role="complementary"],
          button:not(#invoice-printable button) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show ONLY the invoice container and its children */
          #invoice-printable,
          #invoice-printable * {
            visibility: visible !important;
          }
          
          #invoice-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          
          /* Page settings */
          @page {
            size: auto;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}