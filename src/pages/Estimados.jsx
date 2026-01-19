import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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


export default function Estimados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showAIWizard, setShowAIWizard] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', statusFilter, teamFilter],
    queryFn: async () => {
      const filters = { deleted_at: null };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (teamFilter !== 'all') filters.team_id = teamFilter;
      
      return base44.entities.Quote.filter(filters, '-created_date');
    },
    staleTime: 5 * 60 * 1000,
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
      toast({
        title: language === 'es' ? 'Cotización marcada como enviada (precios bloqueados)' : 'Quote marked as sent (prices locked)',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const user = await base44.auth.me();
      await base44.entities.Quote.update(id, { 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: language === 'es' ? 'Movido a papelera' : 'Moved to trash',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: language === 'es' ? 'Error al eliminar' : 'Delete failed',
        variant: 'destructive'
      });
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
      toast({
        title: language === 'es' ? '✅ Estimado duplicado' : '✅ Quote duplicated',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Duplicate error:', error);
      toast({
        title: language === 'es' ? 'Error al duplicar' : 'Failed to duplicate',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quote) => {
      const invoiceNumber = `INV-${Date.now()}`;
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
        console.warn('Provisioning failed (non-critical):', provisionError);
      }

      return newInvoice;
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: t('convertedToInvoice'),
        variant: 'success'
      });
      window.open(createPageUrl(`VerFactura?id=${newInvoice.id}`), '_blank');
    },
  });

  const filteredQuotes = quotes.filter(quote => {
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
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('quotes')}
          description={`${draftQuotes.length} ${t('drafts').toLowerCase()}, ${sentQuotes.length} ${t('sent').toLowerCase()}, ${approvedQuotes.length} ${t('approved').toLowerCase()}`}
          icon={FileText}
          actions={
            isAdmin && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("Papelera"))}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Papelera' : 'Trash'}
                </Button>
                <QuotePDFImporter onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quotes'] })} />
                <Button
                  onClick={() => setShowAIWizard(true)}
                  className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-none"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">{language === 'es' ? 'IA' : 'AI'}</span>
                </Button>
                <Link to={createPageUrl("CrearEstimado")} className="flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    className="w-full border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 min-h-[44px] px-3 sm:px-4"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">{t('newQuote')}</span>
                    <span className="sm:hidden">{language === 'es' ? 'Nuevo' : 'New'}</span>
                  </Button>
                </Link>
              </div>
            )
          }
        />

        {/* Filter Bar */}
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

        {/* Quotes Grid */}
        {isLoading ? (
          <SkeletonDocumentList count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {filteredQuotes.map(quote => (
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
        )}

        {filteredQuotes.length === 0 && !isLoading && (
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {quotes.length === 0 ? t('noQuotes') : (language === 'es' ? 'No se encontraron estimados' : 'No quotes found')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {quotes.length === 0
                  ? (language === 'es' ? 'Comienza creando tu primer estimado' : 'Start by creating your first quote')
                  : (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
                }
              </p>
              {isAdmin && quotes.length === 0 && (
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setShowAIWizard(true)}
                    className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                  </Button>
                  <Link to={createPageUrl("CrearEstimado")}>
                    <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('newQuote')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Wizard Dialog */}
        <Dialog open={showAIWizard} onOpenChange={setShowAIWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#507DB4]" />
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