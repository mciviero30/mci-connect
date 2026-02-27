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
import { trackRecentlyViewed } from "@/components/shared/RecentlyViewed";
import QuoteChangeHistory from "@/components/quotes/QuoteChangeHistory";
import QuoteReminder from "@/components/quotes/QuoteReminder";
import QuoteSignature from "@/components/quotes/QuoteSignature";
import QuoteVersions from "@/components/quotes/QuoteVersions";
import QuoteCompare from "@/components/quotes/QuoteCompare";
import { SaveAsTemplateButton } from "@/components/quotes/QuoteTemplates";
import { downloadQuotePDF } from "@/components/pdf/generateQuotePDF";
import { getQuoteStatusMeta } from "../components/core/statusConfig";
import { useUI } from "@/components/contexts/FieldModeContext";
import { Maximize2 } from "lucide-react";

export default function VerEstimado() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  const { toggleFocusMode } = useUI();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      const q = await base44.entities.Quote.get(quoteId);
      // I7 - Track recently viewed
      if (q) {
        trackRecentlyViewed('quote', q.id, q.quote_number);
      }
      return q;
    },
    enabled: !!quoteId,
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
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

        const formatDateSafe = (dateStr, formatStr = 'd MMMM yyyy') => {
          try {
            return dateStr ? format(new Date(dateStr), formatStr, { locale: language === 'es' ? es : undefined }) : 'N/A';
          } catch {
            return dateStr || 'N/A';
          }
        };

        await base44.integrations.Core.SendEmail({
          to: quote.customer_email,
          subject: `${t('quote')} ${quote.quote_number} - ${quote.job_name}`,
          body: `${t('dear')} ${quote.customer_name},

${t('quoteEmailBody')} ${quote.job_name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${t('quoteNumber')}: ${quote.quote_number}
${t('date')}: ${formatDateSafe(quote.quote_date, language === 'es' ? 'd MMMM yyyy' : 'MMMM d, yyyy')}
${t('validUntil')}: ${formatDateSafe(quote.valid_until, language === 'es' ? 'd MMMM yyyy' : 'MMMM d, yyyy')}
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
      toast({
        title: t('quoteUpdated'),
        variant: 'success'
      });
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Converting quote to invoice from VerEstimado...', quote);
      
      // CRITICAL: Immediately mark as converting to prevent double-clicks
      await base44.entities.Quote.update(quote.id, { 
        status: 'converted_to_invoice'
      });
      
      // AUTO-CREATE WorkAuthorization for approved quotes
      console.log('🔐 Auto-creating WorkAuthorization...');
      const authorization = await base44.entities.WorkAuthorization.create({
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        authorization_type: 'fixed',
        approval_source: 'signed_quote',
        authorization_number: quote.quote_number,
        approved_amount: quote.total,
        approved_at: new Date().toISOString(),
        verified_by_user_id: user?.id,
        verified_by_email: user?.email,
        verified_by_name: user?.full_name,
        verification_notes: `Auto-generated from Quote ${quote.quote_number}`,
        linked_quote_id: quote.id,
        status: 'approved'
      });
      console.log('✅ WorkAuthorization created:', authorization.id);
      
      let jobId = quote.job_id;
      let wasJobCreated = false;
      let mciFieldSyncSuccess = false;
      
      // CRITICAL: Create Job in MCI Connect when converting to Invoice
      if (!jobId) {
        console.log('📁 Creating new job in MCI Connect...');
        
        // Generate job number
        const { data: jobNumberData } = await base44.functions.invoke('generateJobNumber', {});
        const job_number = jobNumberData.job_number;
        
        const newJob = await base44.entities.Job.create({
          name: quote.job_name,
          job_number: job_number,
          address: quote.job_address,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          contract_amount: quote.total,
          estimated_cost: quote.estimated_cost || 0,
          estimated_hours: quote.estimated_hours || 0,
          status: 'active',
          team_id: quote.team_id,
          team_name: quote.team_name,
          color: 'blue',
          description: `Created from Quote ${quote.quote_number}`
        });
        
        jobId = newJob.id;
        wasJobCreated = true;
        console.log('✅ Job created:', jobId, job_number);
        
        // Update quote with job_id
        await base44.entities.Quote.update(quote.id, { job_id: jobId });
        
        // Sync to MCI Field in background - don't wait
        base44.functions.invoke('syncJobToMCIField', { jobId })
          .then(() => { mciFieldSyncSuccess = true; })
          .catch(err => console.warn('Background MCI Field sync failed:', err));
      } else {
        console.log('✅ Using existing job:', jobId);
        // Load existing job to accumulate contract amounts
        const existingJobs = await base44.entities.Job.filter({ id: jobId });
        if (existingJobs.length > 0) {
          const existingJob = existingJobs[0];
          const currentContractAmount = existingJob.contract_amount || 0;
          const newTotal = currentContractAmount + quote.total;
          
          // Update existing job - ACCUMULATE contract amount
          await base44.entities.Job.update(jobId, {
            contract_amount: newTotal,
            status: 'active'
          });
          
          console.log(`✅ Job contract updated: $${currentContractAmount} + $${quote.total} = $${newTotal}`);
        }
      }

      // Step 3: Create invoice
      console.log('📄 Creating invoice...');
      
      // Generate invoice number using backend function
      const { data: invoiceNumberData } = await base44.functions.invoke('generateInvoiceNumber', {});
      const invoice_number = invoiceNumberData.invoice_number;

      const invoiceData = {
        invoice_number,
        quote_id: quote.id,
        authorization_id: authorization.id,
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
        status: 'draft',
        approval_status: 'approved'
      };

      console.log('Creating invoice with data:', invoiceData);
      const newInvoice = await base44.entities.Invoice.create(invoiceData);
      console.log('✅ Invoice created successfully:', newInvoice);

      // Update quote with invoice link (status already set to prevent double-click)
      await base44.entities.Quote.update(quote.id, {
        invoice_id: newInvoice.id
      });

      // TRIGGER 1: Quote → Invoice Conversion Provisioning (ONLY IF APPROVED) - Run in background
      const newInvoiceApprovalStatus = newInvoice.approval_status || 'approved';
      if (newInvoiceApprovalStatus === 'approved') {
        // Don't await - let it run in background for faster UX
        base44.functions.invoke('provisionJobFromInvoice', {
          invoice_id: newInvoice.id,
          mode: 'convert'
        }).catch(err => console.warn('Background provisioning failed:', err));
      }

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
      
      toast({
        title: message,
        variant: 'success'
      });
      
      // Navigate to the new invoice
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${newInvoice.id}`));
      }, 1500);
    },
    onError: (error) => {
      console.error('❌ Error in convertToInvoiceMutation:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      // Generate new quote number using backend function
      const response = await base44.functions.invoke('generateQuoteNumber', {});
      const new_quote_number = response.quote_number || response.data?.quote_number;

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
      toast({
        title: t('quoteClonedSuccessfully'),
        variant: 'success'
      });
      navigate(createPageUrl(`CrearEstimado?id=${newQuote.id}`));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Quote.delete(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: t('quoteDeleted'),
        variant: 'success'
      });
      navigate(createPageUrl('Estimados'));
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!quote) return;
    downloadQuotePDF(quote);
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
      toast({
        title: t('linkCopiedToClipboard'),
        variant: 'success'
      });
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

  const statusMeta = getQuoteStatusMeta(quote.status, language);
  const canDelete = ['draft', 'sent', 'rejected'].includes(quote.status);
  const canEdit = quote.status === 'draft' || quote.status === 'converted_to_invoice';
  const canReopen = quote.status === 'sent';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar - Reorganized */}
      <div className="no-print border-b shadow-sm px-4 py-3" style={{background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)', borderColor: 'rgba(0, 0, 0, 0.2)'}}>
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Estimados'))}
              className="text-slate-300 hover:text-white hover:bg-slate-800 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white truncate">{quote.quote_number}</h1>
              <Badge className={quote.status === 'converted_to_invoice' ? "bg-slate-900 text-white text-[10px] px-2 py-0.5" : `${statusMeta.badgeClass} text-[10px] px-2 py-0.5`}>{statusMeta.label}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            {/* Primary Actions - Compact */}
            {quote.status !== 'converted_to_invoice' && (
              <Button
                size="sm"
                onClick={() => convertToInvoiceMutation.mutate()}
                disabled={convertToInvoiceMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs px-3 h-9"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                {language === 'es' ? 'A Factura' : 'To Invoice'}
              </Button>
            )}

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl(`CrearEstimado?id=${quote.id}`))}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs px-3 h-9"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                {t('edit')}
              </Button>
            )}

            {canReopen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatusMutation.mutate('draft')}
                disabled={updateStatusMutation.isPending}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs px-3 h-9"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                {language === 'es' ? 'Re-abrir' : 'Reopen'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatusMutation.mutate('sent')}
              disabled={quote.status !== 'draft' || updateStatusMutation.isPending}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-50 text-xs px-3 h-9"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              {language === 'es' ? 'Enviar' : 'Send'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs px-3 h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              PDF
            </Button>

            {quote.status === 'sent' && <QuoteReminder quote={quote} />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 px-2 h-9">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800">
                <DropdownMenuItem onClick={toggleFocusMode} className="cursor-pointer text-white hover:bg-slate-800">
                  <Maximize2 className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Modo Enfoque' : 'Focus Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
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
            <div className="bg-gradient-to-br from-[#EBF2FF] to-white border-2 border-[#507DB4]/20 rounded-xl shadow-lg p-5 space-y-3">
              <h4 className="font-bold text-[#507DB4] text-sm uppercase tracking-wide flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-[#507DB4] to-[#6B9DD8] rounded-full"></div>
                {language === 'es' ? 'Información del Proyecto' : 'Project Information'}
              </h4>
              <div className="text-sm space-y-2.5">
                {/* Total Job */}
                <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-lg">
                  <span className="text-white font-bold">{language === 'es' ? 'Total Trabajo' : 'Total Job'}</span>
                  <span className="font-bold text-white text-lg">${quote.total?.toFixed(2) || '0.00'}</span>
                </div>

                {/* Total Profit Est. - Calculate from catalog costs */}
                {(() => {
                  // Calculate cost from catalog items
                  const estimatedCost = (quote.items || []).reduce((sum, item) => {
                    const catalogItem = catalogItems.find(ci => ci.name === item.item_name);
                    if (!catalogItem) return sum;
                    
                    const costPerUnit = catalogItem.cost_per_unit || 0;
                    const materialCost = catalogItem.material_cost || 0;
                    const totalCost = (costPerUnit + materialCost) * (item.quantity || 0);
                    return sum + totalCost;
                  }, 0);
                  
                  const profit = (quote.subtotal || quote.total || 0) - estimatedCost;
                  
                  return estimatedCost > 0 ? (
                    <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-green-600 to-green-700 rounded-lg">
                      <span className="text-white font-bold">{language === 'es' ? 'Profit Est.' : 'Total Profit Est.'}</span>
                      <span className="font-bold text-white text-lg">
                        ${profit.toFixed(2)}
                      </span>
                    </div>
                  ) : null;
                })()}
                
                {/* Estimated Hours */}
                {quote.estimated_hours !== undefined && quote.estimated_hours !== null && (
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-[#507DB4]/10">
                    <span className="text-slate-700 font-medium">{language === 'es' ? 'Horas Est.' : 'Est. Hours'}</span>
                    <span className="font-bold text-[#507DB4]">{quote.estimated_hours.toFixed(1)}h</span>
                  </div>
                )}

                {/* Work Days */}
                {(() => {
                  const hotelItem = (quote.items || []).find(i => i.calculation_type === 'hotel');
                  const perDiemItem = (quote.items || []).find(i => i.calculation_type === 'per_diem');
                  const techCount = hotelItem?.tech_count || perDiemItem?.tech_count || 1;
                  const totalHours = quote.estimated_hours || 0;
                  const workDays = totalHours > 0 ? Math.round((totalHours / (8 * techCount)) * 2) / 2 : 0;
                  
                  return workDays > 0 ? (
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-amber-200">
                      <span className="text-slate-700 font-medium">{language === 'es' ? 'Días Hábiles' : 'Work Days'}</span>
                      <span className="font-bold text-amber-600">{workDays.toFixed(1)} {language === 'es' ? 'días' : 'days'}</span>
                    </div>
                  ) : null;
                })()}
                
                {/* Driving Time */}
                {(() => {
                  const drivingItems = (quote.items || []).filter(i => i.travel_item_type === 'driving_time');
                  const totalDrivingHours = drivingItems.reduce((sum, item) => sum + (item.duration_value || 0), 0);
                  const totalTechs = drivingItems.reduce((sum, item) => sum + (item.tech_count || 1), 0);
                  return totalDrivingHours > 0 ? (
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-blue-200">
                      <span className="text-slate-700 font-medium">{language === 'es' ? 'Tiempo Viaje' : 'Driving Time'}</span>
                      <span className="font-bold text-blue-600">
                        {totalDrivingHours.toFixed(1)}h • {totalTechs} {language === 'es' ? (totalTechs === 1 ? 'persona' : 'personas') : (totalTechs === 1 ? 'person' : 'people')}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Miles */}
                {(() => {
                  const mileageItems = (quote.items || []).filter(i => i.travel_item_type === 'miles_per_vehicle');
                  const totalMiles = mileageItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  const totalVehicles = mileageItems.reduce((max, item) => Math.max(max, item.vehicle_count || 1), 0);
                  return totalMiles > 0 ? (
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-cyan-200">
                      <span className="text-slate-700 font-medium">{language === 'es' ? 'Millas' : 'Miles'}</span>
                      <span className="font-bold text-cyan-600">
                        {totalMiles.toFixed(1)} mi • {totalVehicles} {language === 'es' ? (totalVehicles === 1 ? 'vehículo' : 'vehículos') : (totalVehicles === 1 ? 'vehicle' : 'vehicles')}
                      </span>
                    </div>
                  ) : null;
                })()}
                
                {/* Hotel */}
                {(() => {
                  const hotelItem = (quote.items || []).find(i => i.calculation_type === 'hotel' || i.item_name?.toLowerCase().includes('hotel'));
                  if (hotelItem) {
                    const nights = hotelItem.quantity || 0;
                    const rooms = hotelItem.tech_count ? Math.ceil(hotelItem.tech_count / 2) : 1;
                    return (
                      <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-purple-200">
                        <span className="text-slate-700 font-medium">{language === 'es' ? 'Hotel' : 'Hotel'}</span>
                        <span className="font-bold text-purple-600">
                          {nights.toFixed(0)} {language === 'es' ? (nights === 1 ? 'noche' : 'noches') : (nights === 1 ? 'night' : 'nights')} • {rooms} {language === 'es' ? (rooms === 1 ? 'cuarto' : 'cuartos') : (rooms === 1 ? 'room' : 'rooms')}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Per Diem */}
                {(() => {
                  const perDiemItem = (quote.items || []).find(i => i.calculation_type === 'per_diem' || (i.item_name?.toLowerCase().includes('per') && i.item_name?.toLowerCase().includes('diem')));
                  if (perDiemItem) {
                    const days = perDiemItem.quantity || 0;
                    const people = perDiemItem.tech_count || 1;
                    return (
                      <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-green-200">
                        <span className="text-slate-700 font-medium">{language === 'es' ? 'Per Diem' : 'Per Diem'}</span>
                        <span className="font-bold text-green-600">
                          {days.toFixed(0)} {language === 'es' ? (days === 1 ? 'día' : 'días') : (days === 1 ? 'day' : 'days')} • {people} {language === 'es' ? (people === 1 ? 'persona' : 'personas') : (people === 1 ? 'person' : 'people')}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Divider if has other stats */}
                {(quote.view_count > 0 || quote.reminder_count > 0) && (
                  <div className="border-t border-[#507DB4]/10 my-2"></div>
                )}
                
                {/* Other stats */}
                {quote.view_count > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'es' ? 'Vistas' : 'Views'}</span>
                    <span className="font-medium">{quote.view_count}</span>
                  </div>
                )}
                {quote.reminder_count > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'es' ? 'Recordatorios' : 'Reminders'}</span>
                    <span className="font-medium">{quote.reminder_count}</span>
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