import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSmartPagination, PaginationControls } from "@/components/hooks/useSmartPagination";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Trash2, Copy, Search, X, MapPin, Users, Sparkles, FileCheck, Trash as TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import AIEstimateInput from "../components/quotes/AIEstimateInput";
import FilterBar from "../components/shared/FilterBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import ModernQuoteCard from "../components/quotes/ModernQuoteCard";
import QuotePDFImporter from "../components/quotes/QuotePDFImporter";
import { getQuoteStatusMeta } from "../components/core/statusConfig";
import { SkeletonDocumentList } from "@/components/shared/SkeletonComponents";
import { useNavigate } from "react-router-dom";
import ExcelExporter, { transformQuotesForExport } from "@/components/shared/ExcelExporter";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { FileSpreadsheet } from "lucide-react";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import SavedFilters from "@/components/shared/SavedFilters";
import CompactListView from "@/components/shared/CompactListView";


export default function Estimados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: Infinity
  });

  const { handleError } = useErrorHandler();

  // Smart pagination for quotes
  const paginationFilters = { deleted_at: null };
  if (statusFilter !== 'all') paginationFilters.status = statusFilter;
  if (teamFilter !== 'all') paginationFilters.team_id = teamFilter;

  const {
    items: quotes,
    isLoading,
    page,
    hasMore,
    hasPrevious,
    nextPage,
    prevPage,
    resetPagination
  } = useSmartPagination({
    entityName: 'Quote',
    filters: paginationFilters,
    sortBy: '-created_date',
    pageSize: 18,
    enabled: !!user
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const sendMutation = useMutation({
    mutationFn: async (quote) => {
      await base44.entities.Quote.update(quote.id, { status: 'sent' });
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Quote'] });
      toast({
        title: language === 'es' ? 'Cotización marcada como enviada (precios bloqueados)' : 'Quote marked as sent (prices locked)',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, 'Quote sent');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // FIN-I1 FIX: use already-cached user, no extra auth.me() call
      await base44.entities.Quote.update(id, { 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Quote'] });
      resetPagination();
      toast({
        title: language === 'es' ? 'Movido a papelera' : 'Moved to trash',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, language === 'es' ? 'Eliminar' : 'Delete');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (quote) => {
      // Generate new quote number using backend function
      const response = await base44.functions.invoke('generateQuoteNumber', {});
      const newQuoteNumber = response?.quote_number || response?.data?.quote_number;
      
      if (!newQuoteNumber) {
        throw new Error('Failed to generate quote number');
      }
      
      const newQuote = {
        ...quote,
        quote_number: newQuoteNumber,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
      };
      delete newQuote.id;
      delete newQuote.created_date;
      delete newQuote.updated_date;
      delete newQuote.created_by;
      
      return base44.entities.Quote.create(newQuote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Quote'] });
      resetPagination();
      toast({
        title: language === 'es' ? '✅ Estimado duplicado' : '✅ Quote duplicated',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, language === 'es' ? 'Duplicar' : 'Duplicate');
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quote) => {
      // Generate proper invoice number using atomic counter
      const numResponse = await base44.functions.invoke('generateInvoiceNumber', {});
      const invoiceNumber = numResponse?.invoice_number || numResponse?.data?.invoice_number;
      
      if (!invoiceNumber || !invoiceNumber.startsWith('INV-')) {
        throw new Error('Failed to generate valid invoice number - format validation failed');
      }

      const invoiceData = {
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
        // FIN-I2 FIX: also copy multi-team arrays
        team_ids: quote.team_ids || (quote.team_id ? [quote.team_id] : []),
        team_names: quote.team_names || (quote.team_name ? [quote.team_name] : []),
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
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
      };

      const newInvoice = await base44.entities.Invoice.create(invoiceData);
      await base44.entities.Quote.update(quote.id, { 
        status: 'converted_to_invoice',
        invoice_id: newInvoice.id 
      });

      // Provision job (Drive + Field) - non-blocking
      try {
        await base44.functions.invoke('provisionJobFromInvoice', {
          invoice_id: newInvoice.id,
          mode: 'convert'
        });
      } catch (provisionError) {
        // Provisioning failed - non-critical
      }

      return newInvoice;
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated'] });
      toast({
        title: t('convertedToInvoice'),
        variant: 'success'
      });
      window.open(createPageUrl(`VerFactura?id=${newInvoice.id}`), '_blank');
    },
    onError: (error) => {
      handleError(error, t('convertedToInvoice'));
    }
  });

  // GUARDRAIL 2️⃣: Defensive normalization for quotes
  const safeQuotes = (quotes || []).map(q => {
   const rawNumber = q?.quote_number || '';
   const isValidFormat = /^(EST-|QT-)\d{5}$/.test(rawNumber);

   if (import.meta.env.DEV && !isValidFormat && rawNumber) {
   }

   return {
     ...q,
     quote_number: isValidFormat ? rawNumber : (rawNumber || 'DRAFT')
   };
  });

  const filteredQuotes = safeQuotes.filter(quote => {
   const searchLower = searchTerm.toLowerCase();
   const matchesSearch = !searchTerm ||
     quote.customer_name?.toLowerCase().includes(searchLower) ||
     quote.quote_number?.toLowerCase().includes(searchLower) ||
     quote.job_name?.toLowerCase().includes(searchLower);

   const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
   const matchesTeam = teamFilter === 'all' || quote.team_id === teamFilter;

   return matchesSearch && matchesStatus && matchesTeam;
  });

  // Memoize expensive filters
  const { draftQuotes, sentQuotes, approvedQuotes, convertedQuotes } = useMemo(() => ({
    draftQuotes: filteredQuotes.filter(q => q.status === 'draft'),
    sentQuotes: filteredQuotes.filter(q => q.status === 'sent'),
    approvedQuotes: filteredQuotes.filter(q => q.status === 'approved'),
    convertedQuotes: filteredQuotes.filter(q => q.status === 'converted_to_invoice')
  }), [filteredQuotes]);



  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-2 md:p-4">
        <PageHeader
          title={t('quotes')}
          description={`${draftQuotes.length} ${t('drafts').toLowerCase()}, ${sentQuotes.length} ${t('sent').toLowerCase()}, ${approvedQuotes.length} ${t('approved').toLowerCase()}`}
          icon={FileText}
          actions={
            isAdmin && (
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <ExcelExporter
                  data={filteredQuotes}
                  filename="quotes"
                  sheetName="Quotes"
                  transformData={transformQuotesForExport}
                  buttonText={language === 'es' ? 'Excel' : 'Excel'}
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-600 hover:bg-green-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("Papelera"))}
                  className="h-6 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="w-3 h-3 mr-1" />
                  {language === 'es' ? 'Papelera' : 'Trash'}
                </Button>
                <QuotePDFImporter onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quotes'] })} />
                <Button
                  onClick={() => setShowAIWizard(true)}
                  className="h-6 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md px-2"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline text-[10px]">{language === 'es' ? 'IA' : 'AI'}</span>
                </Button>
                <Link to={createPageUrl("CrearEstimado")}>
                  <Button
                    variant="outline"
                    className="h-6 border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline text-[10px]">{t('newQuote')}</span>
                    <span className="sm:hidden text-[10px]">{language === 'es' ? 'Nuevo' : 'New'}</span>
                  </Button>
                </Link>
              </div>
            )
          }
        />

        <div className="mb-2 flex items-center gap-2">
          <div className="flex-1">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={[
                { value: 'draft', label: getQuoteStatusMeta('draft', language).label, dotClass: getQuoteStatusMeta('draft', language).dotClass },
                { value: 'sent', label: getQuoteStatusMeta('sent', language).label, dotClass: getQuoteStatusMeta('sent', language).dotClass },
                { value: 'approved', label: getQuoteStatusMeta('approved', language).label, dotClass: getQuoteStatusMeta('approved', language).dotClass },
                { value: 'converted_to_invoice', label: getQuoteStatusMeta('converted_to_invoice', language).label, dotClass: getQuoteStatusMeta('converted_to_invoice', language).dotClass }
              ]}
              teamFilter={teamFilter}
              onTeamChange={setTeamFilter}
              teams={teams}
              onClearFilters={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTeamFilter('all');
              }}
              language={language}
            />
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        <div className="mb-2">
          <SavedFilters
            page="quotes"
            currentFilters={{ searchTerm, statusFilter, teamFilter }}
            onApplyFilter={(filters) => {
              if (filters.searchTerm) setSearchTerm(filters.searchTerm);
              if (filters.statusFilter) setStatusFilter(filters.statusFilter);
              if (filters.teamFilter) setTeamFilter(filters.teamFilter);
            }}
            user={user}
          />
        </div>

        {/* Quotes Grid/List */}
        {isLoading ? (
          <SkeletonDocumentList count={6} />
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
              {filteredQuotes.length > 0 && filteredQuotes.map(quote => (
                <ModernQuoteCard
                  key={quote.id}
                  quote={quote}
                  onDuplicate={(q) => duplicateMutation.mutate(q)}
                  onDelete={(q) => deleteMutation.mutate(q.id)}
                  onConvert={(q) => convertToInvoiceMutation.mutate(q)}
                  onSend={(q) => sendMutation.mutate(q)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
            <PaginationControls
              page={page}
              hasMore={hasMore}
              hasPrevious={hasPrevious}
              onNext={nextPage}
              onPrevious={prevPage}
              isLoading={isLoading}
              language={language}
            />
          </>
        ) : (
          <>
            <CompactListView
              items={filteredQuotes}
              entityType="quote"
              user={user}
              getTitle={(quote) => quote.customer_name}
              getSubtitle={(quote) => `${quote.quote_number} • ${quote.job_name}`}
              getBadges={(quote) => (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  quote.status === 'draft' ? 'bg-slate-50 text-slate-700 border border-slate-200' :
                  quote.status === 'sent' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  quote.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                  'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {getQuoteStatusMeta(quote.status, language).label}
                </span>
              )}
              getAmount={(quote) => `$${quote.total?.toLocaleString() || 0}`}
              onItemClick={(quote) => navigate(createPageUrl(`VerEstimado?id=${quote.id}`))}
            />
            <PaginationControls
              page={page}
              hasMore={hasMore}
              hasPrevious={hasPrevious}
              onNext={nextPage}
              onPrevious={prevPage}
              isLoading={isLoading}
              language={language}
            />
          </>
        )}

        {filteredQuotes.length === 0 && !isLoading && (
          <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {quotes.length === 0 ? t('noQuotes') : (language === 'es' ? 'No se encontraron estimados' : 'No quotes found')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-3 text-[10px]">
                {quotes.length === 0
                  ? (language === 'es' ? 'Comienza creando tu primer estimado' : 'Start by creating your first quote')
                  : (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
                }
              </p>
              {isAdmin && quotes.length === 0 && (
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => setShowAIWizard(true)}
                    className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md h-6"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    <span className="text-[10px]">{language === 'es' ? 'Crear con IA' : 'Create with AI'}</span>
                  </Button>
                  <Link to={createPageUrl("CrearEstimado")}>
                    <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md h-6">
                      <Plus className="w-3 h-3 mr-1" />
                      <span className="text-[10px]">{t('newQuote')}</span>
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Wizard Dialog */}
        <Dialog open={showAIWizard} onOpenChange={setShowAIWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#507DB4]" />
                {language === 'es' ? 'Crear Estimado con IA' : 'Create Quote with AI'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AIEstimateInput
                onComplete={() => {
                  setShowAIWizard(false);
                  queryClient.invalidateQueries({ queryKey: ['quotes'] });
                }}
                onCancel={() => setShowAIWizard(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}