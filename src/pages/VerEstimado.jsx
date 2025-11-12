import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Mail,
  Share2,
  Printer,
  FileCheck,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  MoreHorizontal,
  Download,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuoteDocument from "../components/documentos/QuoteDocument";

export default function VerEstimado() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => base44.entities.Quote.get(quoteId),
    enabled: !!quoteId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.Quote.update(quoteId, { status: newStatus });

      if (newStatus === 'sent') {
        const itemsList = quote.items.map(item => {
          let itemDisplay = "";
          if (item.item_name) {
            itemDisplay = item.item_name;
            if (item.description) {
              itemDisplay += `\n  ${item.description}`;
            }
          } else if (item.description) {
            itemDisplay = item.description;
          }
          return `${item.quantity} ${item.unit} - ${itemDisplay} @ $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`;
        }).join('\n\n');

        await base44.integrations.Core.SendEmail({
          to: quote.customer_email,
          subject: `${t('quote')} ${quote.quote_number} - ${quote.job_name}`,
          body: `${t('dear')} ${quote.customer_name},

${t('quoteEmailBody')} ${quote.job_name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t('quoteNumber')}: ${quote.quote_number}
${t('date')}: ${format(new Date(quote.quote_date), language === 'es' ? 'd MMMM yyyy' : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}
${t('validUntil')}: ${format(new Date(quote.valid_until), language === 'es' ? 'd MMMM yyyy' : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${t('items').toUpperCase()}:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t('subtotal')}: $${quote.subtotal.toFixed(2)}
${t('tax')} (${quote.tax_rate}%): $${quote.tax_amount.toFixed(2)}
${t('total').toUpperCase()}: $${quote.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${quote.notes ? `${t('notes')}:\n${quote.notes}\n\n` : ''}${quote.terms ? `${t('terms')}:\n${quote.terms}\n\n` : ''}${t('thankYou')}

MODERN COMPONENTS INSTALLATION
2414 Meadow Isle Ln
Lawrenceville, Georgia 30043, U.S.A`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quoteUpdated'));
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Converting quote to invoice from VerEstimado...', quote);
      
      let jobId = quote.job_id;
      let wasJobCreated = false;
      let mciFieldSyncSuccess = false;
      
      // Step 1: Create Job in MCI Connect if it doesn't exist
      if (!jobId) {
        console.log('📁 No job_id found, creating new job in MCI Connect...');
        
        const jobData = {
          name: quote.job_name,
          address: quote.job_address,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          contract_amount: quote.total,
          status: 'active',
          team_id: quote.team_id,
          team_name: quote.team_name,
          description: `Auto-created from quote ${quote.quote_number}`
        };
        
        console.log('Creating job with data:', jobData);
        const newJob = await base44.entities.Job.create(jobData);
        console.log('✅ Job created successfully in MCI Connect:', newJob);
        
        jobId = newJob.id;
        wasJobCreated = true;
        
        // Step 2: Sync with MCI Field
        try {
          console.log('🔗 Syncing job with MCI Field...');
          
          const mciFieldResponse = await fetch('https://mci-field.com/api/jobs/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer MCISync_2024_SecureToken_abc123xyz789`
            },
            body: JSON.stringify({
              job_name: quote.job_name,
              job_address: quote.job_address,
              source: 'mci_connect',
              mci_connect_job_id: jobId
            })
          });

          if (mciFieldResponse.ok) {
            const mciFieldData = await mciFieldResponse.json();
            console.log('✅ Job synced with MCI Field:', mciFieldData);
            mciFieldSyncSuccess = true;
          } else {
            console.warn('⚠️ MCI Field sync failed but continuing with invoice creation');
          }
        } catch (syncError) {
          console.error('⚠️ Error syncing with MCI Field:', syncError);
          // Continue with invoice creation even if sync fails
        }
        
        // Update quote with job_id
        console.log('Updating quote with job_id:', jobId);
        await base44.entities.Quote.update(quote.id, {
          job_id: jobId
        });
        console.log('Quote updated with job_id');
      } else {
        console.log('Using existing job_id:', jobId);
      }

      // Step 3: Create invoice
      console.log('📄 Creating invoice...');
      const invoices = await base44.entities.Invoice.list();
      const existingNumbers = invoices
        .map(inv => inv.invoice_number)
        .filter(n => n?.startsWith('INV-'))
        .map(n => parseInt(n.replace('INV-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const invoice_number = `INV-${String(nextNumber).padStart(5, '0')}`;

      const invoiceData = {
        invoice_number,
        quote_id: quote.id,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        job_name: quote.job_name,
        job_id: jobId,
        job_address: quote.job_address,
        team_id: quote.team_id,
        team_name: quote.team_name,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        items: quote.items,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        amount_paid: 0,
        balance: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        status: 'draft'
      };

      console.log('Creating invoice with data:', invoiceData);
      const newInvoice = await base44.entities.Invoice.create(invoiceData);
      console.log('✅ Invoice created successfully:', newInvoice);

      // Update quote status
      await base44.entities.Quote.update(quote.id, {
        status: 'converted_to_invoice',
        invoice_id: newInvoice.id
      });

      return { newInvoice, jobId, wasJobCreated, mciFieldSyncSuccess };
    },
    onSuccess: ({ newInvoice, jobId, wasJobCreated, mciFieldSyncSuccess }) => {
      console.log('✅ Conversion successful, invalidating queries...');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      let message = language === 'es' 
        ? `✅ Factura creada exitosamente`
        : `✅ Invoice created successfully`;
      
      if (wasJobCreated) {
        message += language === 'es' 
          ? `\n📁 Trabajo creado en MCI Connect`
          : `\n📁 Job created in MCI Connect`;
      }
      
      if (mciFieldSyncSuccess) {
        message += language === 'es'
          ? `\n🔗 Trabajo sincronizado con MCI Field`
          : `\n🔗 Job synced with MCI Field`;
      }
      
      toast.success(message);
      
      // Navigate to the new invoice
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${newInvoice.id}`));
      }, 1500);
    },
    onError: (error) => {
      console.error('❌ Error in convertToInvoiceMutation:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const quotes = await base44.entities.Quote.list();
      const existingNumbers = quotes
        .map(q => q.quote_number)
        .filter(n => n?.startsWith('EST-'))
        .map(n => parseInt(n.replace('EST-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const new_quote_number = `EST-${String(nextNumber).padStart(5, '0')}`;

      const clonedQuote = {
        ...quote,
        quote_number: new_quote_number,
        quote_date: format(new Date(), 'yyyy-MM-dd'),
        valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: 'draft'
      };

      delete clonedQuote.id;
      delete clonedQuote.created_date;
      delete clonedQuote.updated_date;
      delete clonedQuote.created_by;
      delete clonedQuote.invoice_id;

      return base44.entities.Quote.create(clonedQuote);
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quoteClonedSuccessfully'));
      navigate(createPageUrl(`CrearEstimado?id=${newQuote.id}`));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Quote.delete(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quoteDeleted'));
      navigate(createPageUrl('Estimados'));
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = `${quote.quote_number} - ${quote.customer_name}`;
    window.print();
    document.title = originalTitle;
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('quote')} ${quote.quote_number}`,
          text: `${t('quoteFor')} ${quote.customer_name}`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('linkCopiedToClipboard'));
    }
  };

  const handleDelete = () => {
    if (window.confirm(t('confirmDeleteQuote'))) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">{t('quoteNotFound')}</p>
      </div>
    );
  }

  const statusConfig = {
    draft: { label: t('draft'), color: "bg-slate-700 text-slate-300" },
    sent: { label: t('sent'), color: "bg-blue-500 text-white" },
    approved: { label: t('approved'), color: "bg-green-500 text-white" },
    rejected: { label: t('rejected'), color: "bg-red-500 text-white" },
    converted_to_invoice: { label: t('converted'), color: "bg-purple-500 text-white" }
  };

  const config = statusConfig[quote.status];
  const canDelete = ['draft', 'sent', 'rejected'].includes(quote.status);
  const canEdit = quote.status === 'draft';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar */}
      <div className="no-print border-b shadow-sm px-6 py-4" style={{background: 'linear-gradient(135deg, #0a1525 0%, #0f2942 100%)', borderColor: 'rgba(0, 206, 209, 0.2)'}}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Estimados'))}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('back')}
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{quote.quote_number}</h1>
              <Badge className={`${config.color} mt-1`}>{config.label}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl(`CrearEstimado?id=${quote.id}`))}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatusMutation.mutate('sent')}
              disabled={quote.status !== 'draft' || updateStatusMutation.isPending}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              {updateStatusMutation.isPending ? t('sending') : t('sendToCustomer')}
            </Button>

            {quote.status !== 'converted_to_invoice' && (
              <Button
                size="sm"
                onClick={() => convertToInvoiceMutation.mutate()}
                disabled={convertToInvoiceMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/30"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                {convertToInvoiceMutation.isPending ? t('converting') : t('convertToInvoice')}
              </Button>
            )}

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
                  {language === 'es' ? 'Descargar PDF' : 'Download PDF'}
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
                {quote.status === 'sent' && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate('approved')} className="cursor-pointer text-white hover:bg-slate-800">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                      {t('markAsAccepted')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate('rejected')} className="cursor-pointer text-white hover:bg-slate-800">
                      <XCircle className="w-4 h-4 mr-2 text-red-400" />
                      {t('markAsDeclined')}
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

      {/* Quote Document */}
      <div className="max-w-4xl mx-auto my-8 print:my-0 bg-white shadow-xl print:shadow-none rounded-lg print:rounded-none">
        <QuoteDocument quote={quote} />
      </div>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          #root, #root * {
            visibility: hidden;
          }
          
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          @page {
            size: auto;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}