import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Plus, Eye, Trash2, Copy, FileCheck, Download, Filter, X, 
  ArrowUpDown, AlertTriangle, CheckSquare, BarChart3, User, Clock,
  ChevronUp, ChevronDown, Bell, MessageCircle, Sparkles, MapPin, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuotePreviewModal from "@/components/quotes/QuotePreviewModal";
import QuoteTemplates from "@/components/quotes/QuoteTemplates";
import QuoteStats from "@/components/quotes/QuoteStats";
import QuoteReminder from "@/components/quotes/QuoteReminder";
import AIEstimateInput from "@/components/quotes/AIEstimateInput";
import QuoteDocument from "@/components/documentos/QuoteDocument";
import _ from "lodash";

export default function Estimados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showAIInput, setShowAIInput] = useState(false);

  // Advanced filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesKeyword, setNotesKeyword] = useState("");

  // Sorting
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Debounced search
  const debouncedSetSearch = useCallback(
    _.debounce((value) => setDebouncedSearch(value), 300),
    []
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('deletedSuccessfully'));
      if (selectedQuote?.id === deleteMutation.variables) {
        setSelectedQuote(null);
      }
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (quote) => {
      const newQuote = {
        ...quote,
        quote_number: `${quote.quote_number}-COPY-${Date.now()}`,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: '',
      };
      delete newQuote.id;
      delete newQuote.created_date;
      delete newQuote.updated_date;
      delete newQuote.created_by;
      delete newQuote.invoice_id;
      
      return base44.entities.Quote.create(newQuote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? '✅ Estimado duplicado' : '✅ Quote duplicated');
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quote) => {
      let jobId = quote.job_id;
      let wasJobCreated = false;
      
      if (!jobId) {
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
        
        const newJob = await base44.entities.Job.create(jobData);
        jobId = newJob.id;
        wasJobCreated = true;
        
        await base44.entities.Quote.update(quote.id, { job_id: jobId });
      }

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

      const newInvoice = await base44.entities.Invoice.create(invoiceData);

      await base44.entities.Quote.update(quote.id, {
        status: 'converted_to_invoice',
        invoice_id: newInvoice.id
      });

      return { newInvoice, wasJobCreated };
    },
    onSuccess: ({ newInvoice }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      toast.success(language === 'es' ? '✅ Factura creada exitosamente' : '✅ Invoice created successfully');
      
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${newInvoice.id}`));
      }, 1500);
    },
  });

  const exportToPDF = () => {
    if (!selectedQuote) {
      toast.error(language === 'es' ? '⚠️ Selecciona un estimado para exportar' : '⚠️ Select a quote to export');
      return;
    }

    const originalTitle = document.title;
    document.title = `${selectedQuote.quote_number} - ${selectedQuote.job_name}`;
    
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setTeamFilter("all");
    setStatusFilter("all");
    setNotesKeyword("");
    setSearchTerm("");
  };

  const hasActiveFilters = dateFrom || dateTo || minAmount || maxAmount || teamFilter !== "all" || statusFilter !== "all" || notesKeyword;

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let result = quotes.filter(quote => {
      if (quote.is_template) return false;

      const search = debouncedSearch.toLowerCase();
      const matchesSearch = !search ||
        quote.customer_name?.toLowerCase().includes(search) ||
        quote.quote_number?.toLowerCase().includes(search) ||
        quote.job_name?.toLowerCase().includes(search);

      const quoteDate = new Date(quote.quote_date);
      const matchesDateFrom = !dateFrom || quoteDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || quoteDate <= new Date(dateTo);
      const matchesMinAmount = !minAmount || (quote.total || 0) >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || (quote.total || 0) <= parseFloat(maxAmount);
      const matchesTeam = teamFilter === "all" || quote.team_id === teamFilter;
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      const matchesNotes = !notesKeyword || 
        (quote.notes && quote.notes.toLowerCase().includes(notesKeyword.toLowerCase()));

      return matchesSearch && matchesDateFrom && matchesDateTo && 
             matchesMinAmount && matchesMaxAmount && matchesTeam && 
             matchesStatus && matchesNotes;
    });

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'total' || sortField === 'subtotal') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      } else if (sortField === 'quote_date' || sortField === 'created_date' || sortField === 'valid_until') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [quotes, debouncedSearch, dateFrom, dateTo, minAmount, maxAmount, teamFilter, statusFilter, notesKeyword, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const isExpired = (quote) => {
    return quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status === 'sent';
  };

  const drafts = filteredQuotes.filter(q => q.status === 'draft');
  const sent = filteredQuotes.filter(q => q.status === 'sent');
  const converted = filteredQuotes.filter(q => q.status === 'converted_to_invoice');
  const totalValue = filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    converted_to_invoice: "bg-purple-50 text-purple-700 border-purple-200"
  };

  const getStatusLabel = (status) => {
    return t(status) || status;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      {/* Header */}
      <div className="border-b bg-white dark:bg-[#1a1a1a] sticky top-0 z-10">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('quotes')}</h1>
              <p className="text-slate-600 dark:text-slate-400">{filteredQuotes.length} {t('total').toLowerCase()}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAIInput(!showAIInput)}
                  variant="outline"
                  size="sm"
                  className={showAIInput ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white border-amber-300 text-amber-700 hover:bg-amber-50"}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'IA' : 'AI'}
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" disabled={!selectedQuote}>
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'PDF' : 'PDF'}
                </Button>
                <Link to={createPageUrl("CrearEstimado")}>
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newQuote')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Input */}
      {showAIInput && (
        <div className="p-4 bg-amber-50 border-b">
          <AIEstimateInput 
            language={language}
            onQuoteGenerated={(quoteData) => {
              navigate(createPageUrl("CrearEstimado"), { state: { aiDraft: quoteData } });
              setShowAIInput(false);
            }}
          />
        </div>
      )}

      {/* Main Content - Sidebar + Preview */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-white dark:bg-[#1a1a1a] flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <Input
              placeholder={t('search') + "..."}
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-slate-50 dark:bg-slate-800"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                <Filter className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Filtros' : 'Filters'}
                {hasActiveFilters && <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5">!</Badge>}
              </Button>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="space-y-3 pt-3 border-t">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={language === 'es' ? 'Estado' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                    <SelectItem value="draft">{language === 'es' ? 'Borrador' : 'Draft'}</SelectItem>
                    <SelectItem value="sent">{language === 'es' ? 'Enviado' : 'Sent'}</SelectItem>
                    <SelectItem value="approved">{language === 'es' ? 'Aprobado' : 'Approved'}</SelectItem>
                    <SelectItem value="converted_to_invoice">{language === 'es' ? 'Convertido' : 'Converted'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Quote List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="p-3 border-b">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{hasActiveFilters ? (language === 'es' ? 'No hay resultados' : 'No results') : t('noQuotes')}</p>
              </div>
            ) : (
              filteredQuotes.map(quote => (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuote(quote)}
                  className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    selectedQuote?.id === quote.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-l-cyan-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{quote.customer_name}</h3>
                    <Badge className={statusColors[quote.status]}>{getStatusLabel(quote.status)}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-1">{quote.job_name}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{quote.quote_number}</span>
                    <span className="font-bold text-cyan-600">${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {format(new Date(quote.quote_date), 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-slate-50 dark:bg-[#181818] overflow-y-auto">
          {selectedQuote ? (
            <div className="max-w-4xl mx-auto p-6">
              {/* Actions Bar */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedQuote.quote_number}</h2>
                  <Badge className={statusColors[selectedQuote.status]}>{getStatusLabel(selectedQuote.status)}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(selectedQuote)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Duplicar' : 'Duplicate'}
                    </Button>
                    {selectedQuote.status !== 'converted_to_invoice' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm(language === 'es' ? '¿Convertir a factura?' : 'Convert to invoice?')) {
                            convertToInvoiceMutation.mutate(selectedQuote);
                          }
                        }}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Convertir' : 'Convert'}
                      </Button>
                    )}
                    <Link to={createPageUrl(`VerEstimado?id=${selectedQuote.id}`)}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Ver Detalles' : 'View Details'}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(language === 'es' ? '¿Eliminar?' : 'Delete?')) {
                          deleteMutation.mutate(selectedQuote.id);
                        }
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Quote Document */}
              <div id="quote-preview-for-pdf" className="bg-white dark:bg-[#282828] rounded-lg shadow-xl">
                <QuoteDocument quote={selectedQuote} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{language === 'es' ? 'Selecciona un estimado para ver los detalles' : 'Select a quote to view details'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}