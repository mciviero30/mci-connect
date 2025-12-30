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
  ArrowLeft,
  MessageSquare,
  History,
  GitBranch,
  GitCompare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import QuoteInternalNotes from "@/components/quotes/QuoteInternalNotes";
import QuoteChangeHistory from "@/components/quotes/QuoteChangeHistory";
import QuoteReminder from "@/components/quotes/QuoteReminder";
import QuoteSignature from "@/components/quotes/QuoteSignature";
import QuoteVersions from "@/components/quotes/QuoteVersions";
import QuoteCompare from "@/components/quotes/QuoteCompare";
import { SaveAsTemplateButton } from "@/components/quotes/QuoteTemplates";

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

  const handleDownloadPDF = async () => {
    if (!quote) return;
    
    try {
      console.log('🔄 Generating Quote PDF using backend function...');
      const response = await base44.functions.invoke('generateQuotePDF', { quoteId: quote.id });
      console.log('✅ PDF generated, downloading...');
      console.log('Response type:', typeof response, response);
      
      // CRITICAL: Response from backend is already a Blob/ArrayBuffer
      // Check if it's already a Blob
      let pdfData;
      if (response instanceof Blob) {
        pdfData = response;
      } else if (response instanceof ArrayBuffer) {
        pdfData = new Blob([response], { type: 'application/pdf' });
      } else if (response?.data) {
        // Fallback if wrapped
        pdfData = new Blob([response.data], { type: 'application/pdf' });
      } else {
        throw new Error('Invalid response format');
      }
      
      const url = window.URL.createObjectURL(pdfData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quote_number}-${quote.customer_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error: ${error.message}`);
    }
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
      <div className="no-print border-b shadow-sm px-6 py-4" style={{background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)', borderColor: 'rgba(0, 0, 0, 0.2)'}}>
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
              <Badge className={config.color === "bg-purple-500 text-white" ? "bg-slate-900 text-white mt-1" : `${config.color} mt-1`}>{config.label}</Badge>
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

            <PDFDownloadButton 
              data={quote} 
              type="quote" 
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
            >
              {language === 'es' ? 'PDF' : 'PDF'}
            </PDFDownloadButton>

            {quote.status !== 'converted_to_invoice' && (
              <Button
                size="sm"
                onClick={() => convertToInvoiceMutation.mutate()}
                disabled={convertToInvoiceMutation.isPending}
                className="soft-cyan-gradient shadow-lg"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                {convertToInvoiceMutation.isPending ? t('converting') : t('convertToInvoice')}
              </Button>
            )}

            {/* New action buttons */}
            {quote.status === 'sent' && <QuoteReminder quote={quote} />}

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
                <DropdownMenuSeparator className="bg-slate-800" />
                <QuoteVersions quote={quote} asMenuItem />
                <QuoteCompare currentQuote={quote} asMenuItem />
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

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto my-8 print:my-0">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quote Document */}
          <div id="quote-printable" className="lg:col-span-2 bg-white shadow-xl print:shadow-none rounded-lg print:rounded-none">
            <QuoteDocument quote={quote} />
          </div>

          {/* Sidebar with tabs */}
          <div className="no-print space-y-4">
            {/* Signature */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
              <QuoteSignature quote={quote} />
            </div>

            {/* Save as template */}
            {quote.status === 'draft' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
                <SaveAsTemplateButton quoteData={quote} />
              </div>
            )}

            {/* Tabs for notes and history */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
              <Tabs defaultValue="notes">
                <TabsList className="w-full bg-slate-100 dark:bg-slate-700">
                  <TabsTrigger value="notes" className="flex-1 text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {language === 'es' ? 'Notas' : 'Notes'}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 text-xs">
                    <History className="w-3 h-3 mr-1" />
                    {language === 'es' ? 'Historial' : 'History'}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="mt-4">
                  <QuoteInternalNotes quoteId={quote.id} notes={quote.internal_notes || []} />
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                  <QuoteChangeHistory history={quote.change_history || []} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                {language === 'es' ? 'Información' : 'Info'}
              </h4>
              <div className="text-sm space-y-2">
                {quote.view_count > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{language === 'es' ? 'Vistas' : 'Views'}</span>
                    <span className="font-medium">{quote.view_count}</span>
                  </div>
                )}
                {quote.reminder_count > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{language === 'es' ? 'Recordatorios' : 'Reminders'}</span>
                    <span className="font-medium">{quote.reminder_count}</span>
                  </div>
                )}
                {quote.profit_margin && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{language === 'es' ? 'Margen' : 'Margin'}</span>
                    <span className="font-medium text-green-600">{quote.profit_margin.toFixed(1)}%</span>
                  </div>
                )}
                {quote.estimated_hours && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{language === 'es' ? 'Horas Est.' : 'Est. Hours'}</span>
                    <span className="font-medium">{quote.estimated_hours}h</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}