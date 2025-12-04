import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Plus, Eye, Trash2, Copy, FileCheck, Download, Filter, X, 
  ArrowUpDown, AlertTriangle, CheckSquare, BarChart3, User, Clock,
  ChevronUp, ChevronDown, Bell, MessageCircle, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import QuoteWhatsApp from "@/components/quotes/QuoteWhatsApp";
import AIEstimateInput from "@/components/quotes/AIEstimateInput";
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

  // Selection
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Preview modal
  const [previewQuote, setPreviewQuote] = useState(null);
  const [showAIInput, setShowAIInput] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quote) => {
      console.log('🔄 Converting quote to invoice...', quote);
      
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
        
        const newJob = await base44.entities.Job.create(jobData);
        jobId = newJob.id;
        wasJobCreated = true;
        
        console.log('✅ Job created in MCI Connect:', newJob);
        
        // Step 2: Sync with MCI Field
        try {
          console.log('🔗 Syncing job with MCI Field...');
          
          const mciFieldResponse = await fetch('https://mci-field.com/api/jobs/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SHARED_API_TOKEN || 'MCISync_2024_SecureToken_abc123xyz789'}`
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
        await base44.entities.Quote.update(quote.id, {
          job_id: jobId
        });
      }

      // Step 3: Create Invoice
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

      const newInvoice = await base44.entities.Invoice.create(invoiceData);
      console.log('✅ Invoice created:', newInvoice);

      // Update quote status
      await base44.entities.Quote.update(quote.id, {
        status: 'converted_to_invoice',
        invoice_id: newInvoice.id
      });

      return { newInvoice, wasJobCreated, mciFieldSyncSuccess };
    },
    onSuccess: ({ newInvoice, wasJobCreated, mciFieldSyncSuccess }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
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
      console.error('❌ Error converting quote:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const exportToExcel = () => {
    // Use quotes directly since filteredQuotes might not be defined yet
    const dataToExport = quotes.filter(quote => {
      const matchesSearch = !searchTerm ||
        quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.job_name?.toLowerCase().includes(searchTerm.toLowerCase());
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

    if (!dataToExport || dataToExport.length === 0) {
      toast.error(language === 'es' ? '⚠️ No hay datos para exportar' : '⚠️ No data to export');
      return;
    }

    try {
      const headers = [
        'Número',
        'Cliente',
        'Email',
        'Teléfono',
        'Proyecto',
        'Dirección',
        'Fecha',
        'Válido Hasta',
        'Subtotal',
        'Impuesto %',
        'Impuesto',
        'Total',
        'Estado',
        'Notas'
      ];

      const rows = dataToExport.map(quote => [
        quote.quote_number || '',
        quote.customer_name || '',
        quote.customer_email || '',
        quote.customer_phone || '',
        quote.job_name || '',
        quote.job_address || '',
        quote.quote_date || '',
        quote.valid_until || '',
        quote.subtotal || 0,
        quote.tax_rate || 0,
        quote.tax_amount || 0,
        quote.total || 0,
        quote.status || '',
        (quote.notes || '').replace(/\n/g, ' ')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimados-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('✅ ' + (language === 'es' ? 'Archivo descargado' : 'File downloaded'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'es' ? '❌ Error al exportar' : '❌ Export failed');
    }
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
      // Exclude templates from main list
      if (quote.is_template) return false;

      // Basic search (use debounced)
      const search = debouncedSearch.toLowerCase();
      const matchesSearch = !search ||
        quote.customer_name?.toLowerCase().includes(search) ||
        quote.quote_number?.toLowerCase().includes(search) ||
        quote.job_name?.toLowerCase().includes(search);

      // Date range filter
      const quoteDate = new Date(quote.quote_date);
      const matchesDateFrom = !dateFrom || quoteDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || quoteDate <= new Date(dateTo);

      // Amount range filter
      const matchesMinAmount = !minAmount || (quote.total || 0) >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || (quote.total || 0) <= parseFloat(maxAmount);

      // Team filter
      const matchesTeam = teamFilter === "all" || quote.team_id === teamFilter;

      // Status filter
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;

      // Notes keyword filter
      const matchesNotes = !notesKeyword || 
        (quote.notes && quote.notes.toLowerCase().includes(notesKeyword.toLowerCase()));

      return matchesSearch && matchesDateFrom && matchesDateTo && 
             matchesMinAmount && matchesMaxAmount && matchesTeam && 
             matchesStatus && matchesNotes;
    });

    // Sort
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

  // Pagination
  const totalPages = Math.ceil(filteredQuotes.length / pageSize);
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Selection handlers
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedQuotes(paginatedQuotes.map(q => q.id));
    } else {
      setSelectedQuotes([]);
    }
  };

  const handleSelectQuote = (quoteId, checked) => {
    if (checked) {
      setSelectedQuotes([...selectedQuotes, quoteId]);
    } else {
      setSelectedQuotes(selectedQuotes.filter(id => id !== quoteId));
      setSelectAll(false);
    }
  };

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedQuotes.map(id => base44.entities.Quote.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? `${selectedQuotes.length} estimados eliminados` : `${selectedQuotes.length} quotes deleted`);
      setSelectedQuotes([]);
      setSelectAll(false);
    }
  });

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Check if quote is expired
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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('quotes')}
          description={`${filteredQuotes.length} ${t('total').toLowerCase()}`}
          icon={FileText}
          actions={
            isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <QuoteTemplates onSelectTemplate={(data) => navigate(createPageUrl("CrearEstimado"), { state: { template: data } })} />
                <Button 
                  onClick={() => setShowAIInput(!showAIInput)}
                  variant="outline"
                  className={showAIInput 
                    ? "bg-amber-100 border-amber-300 text-amber-700" 
                    : "bg-white border-amber-300 text-amber-700 hover:bg-amber-50"}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'IA' : 'AI'}
                </Button>
                <Button 
                  onClick={exportToExcel}
                  variant="outline"
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                  disabled={filteredQuotes.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Exportar' : 'Export'}
                </Button>
                <Link to={createPageUrl("CrearEstimado")}>
                  <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newQuote')}
                  </Button>
                </Link>
              </div>
            )
          }
        />

        {/* Tabs for List vs Stats */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="list" className="data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-700">
              <FileText className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Lista' : 'List'}
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Estadísticas' : 'Statistics'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* AI Quote Input */}
        {showAIInput && (
          <div className="mb-6">
            <AIEstimateInput 
              language={language}
              onQuoteGenerated={(quoteData) => {
                // Navigate to create page with pre-filled data
                navigate(createPageUrl("CrearEstimado"), { state: { aiDraft: quoteData } });
                setShowAIInput(false);
              }}
            />
          </div>
        )}

        {activeTab === 'stats' ? (
          <QuoteStats quotes={quotes.filter(q => !q.is_template)} />
        ) : (
          <>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('drafts')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{drafts.length}</p>
                </div>
                <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-2xl">
                  <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('sent')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{sent.length}</p>
                </div>
                <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-700 dark:text-blue-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('converted')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{converted.length}</p>
                </div>
                <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-purple-700 dark:text-purple-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-cyan-50">{t('totalValue')}</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 mb-6">
          <CardContent className="p-4">
            {/* Bulk actions */}
            {selectedQuotes.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                  {selectedQuotes.length} {language === 'es' ? 'seleccionados' : 'selected'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToExcel}
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {language === 'es' ? 'Exportar Selección' : 'Export Selected'}
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(language === 'es' 
                        ? `¿Eliminar ${selectedQuotes.length} estimados?` 
                        : `Delete ${selectedQuotes.length} quotes?`)) {
                        bulkDeleteMutation.mutate();
                      }
                    }}
                    className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {language === 'es' ? 'Eliminar' : 'Delete'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSelectedQuotes([]); setSelectAll(false); }}
                  className="text-slate-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <Input
                placeholder={t('search') + "..."}
                value={searchTerm}
                onChange={handleSearchChange}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                className={showFilters ? "bg-[#3B9FF3] text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}
              >
                <Filter className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Filtros' : 'Filters'}
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                    {[dateFrom, dateTo, minAmount, maxAmount, teamFilter !== "all", statusFilter !== "all", notesKeyword].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Limpiar' : 'Clear'}
                </Button>
              )}
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-medium mb-2 block">
                      {language === 'es' ? 'Fecha Desde' : 'Date From'}
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Fecha Hasta' : 'Date To'}
                    </Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Estado' : 'Status'}
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="all" className="text-slate-900">
                          {language === 'es' ? 'Todos' : 'All'}
                        </SelectItem>
                        <SelectItem value="draft" className="text-slate-900">
                          {language === 'es' ? 'Borrador' : 'Draft'}
                        </SelectItem>
                        <SelectItem value="sent" className="text-slate-900">
                          {language === 'es' ? 'Enviado' : 'Sent'}
                        </SelectItem>
                        <SelectItem value="approved" className="text-slate-900">
                          {language === 'es' ? 'Aprobado' : 'Approved'}
                        </SelectItem>
                        <SelectItem value="rejected" className="text-slate-900">
                          {language === 'es' ? 'Rechazado' : 'Rejected'}
                        </SelectItem>
                        <SelectItem value="converted_to_invoice" className="text-slate-900">
                          {language === 'es' ? 'Convertido' : 'Converted'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Amount Range */}
                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Monto Mínimo' : 'Min Amount'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="$0.00"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Monto Máximo' : 'Max Amount'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="$999,999.99"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>

                  {/* Team Filter */}
                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Equipo' : 'Team'}
                    </Label>
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="all" className="text-slate-900">
                          {language === 'es' ? 'Todos los Equipos' : 'All Teams'}
                        </SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id} className="text-slate-900">
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes Keyword */}
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">
                    {language === 'es' ? 'Buscar en Notas' : 'Search in Notes'}
                  </Label>
                  <Input
                    value={notesKeyword}
                    onChange={(e) => setNotesKeyword(e.target.value)}
                    placeholder={language === 'es' ? 'Palabra clave en notas...' : 'Keyword in notes...'}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    {language === 'es' 
                      ? `Mostrando ${filteredQuotes.length} de ${quotes.length} estimados`
                      : `Showing ${filteredQuotes.length} of ${quotes.length} quotes`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sort buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-sm text-slate-500 self-center mr-2">{language === 'es' ? 'Ordenar:' : 'Sort:'}</span>
          {[
            { field: 'created_date', label: language === 'es' ? 'Fecha' : 'Date' },
            { field: 'total', label: language === 'es' ? 'Monto' : 'Amount' },
            { field: 'customer_name', label: language === 'es' ? 'Cliente' : 'Customer' },
            { field: 'status', label: language === 'es' ? 'Estado' : 'Status' },
          ].map(({ field, label }) => (
            <Button
              key={field}
              size="sm"
              variant={sortField === field ? "default" : "outline"}
              onClick={() => handleSort(field)}
              className={sortField === field 
                ? "bg-cyan-600 text-white" 
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"}
            >
              {label}
              {sortField === field && (
                sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="bg-white/90 dark:bg-[#282828]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table Header with select all */}
        {!isLoading && paginatedQuotes.length > 0 && (
          <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-t-lg border border-b-0 border-slate-200 dark:border-slate-700">
            <Checkbox 
              checked={selectAll} 
              onCheckedChange={handleSelectAll}
              className="border-slate-400"
            />
            <span className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {language === 'es' ? 'Cliente / Proyecto' : 'Customer / Project'}
            </span>
            <span className="w-32 text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
              {language === 'es' ? 'Estado' : 'Status'}
            </span>
            <span className="w-28 text-sm font-medium text-slate-600 dark:text-slate-400 text-right">
              {language === 'es' ? 'Total' : 'Total'}
            </span>
            <span className="w-48 text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
              {language === 'es' ? 'Acciones' : 'Actions'}
            </span>
          </div>
        )}

        <div className="space-y-0">
          {!isLoading && paginatedQuotes.map((quote, idx) => (
            <Card 
              key={quote.id} 
              className={`bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group cursor-pointer ${
                idx === 0 ? 'rounded-t-none' : ''
              } ${selectedQuotes.includes(quote.id) ? 'ring-2 ring-cyan-400' : ''}`}
              onClick={() => setPreviewQuote(quote)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedQuotes.includes(quote.id)} 
                      onCheckedChange={(checked) => handleSelectQuote(quote.id, checked)}
                      className="border-slate-400"
                    />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{quote.customer_name}</h3>
                      {isExpired(quote) && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {language === 'es' ? 'Vencido' : 'Expired'}
                        </Badge>
                      )}
                      {quote.version > 1 && (
                        <Badge variant="outline" className="text-xs">v{quote.version}</Badge>
                      )}
                      {quote.assigned_to_name && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {quote.assigned_to_name}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm truncate">{quote.job_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span>{quote.quote_number}</span>
                      <span>•</span>
                      <span>{format(new Date(quote.quote_date), 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}</span>
                      {quote.team_name && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-600">{quote.team_name}</span>
                        </>
                      )}
                      {quote.reminder_count > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Bell className="w-3 h-3" />
                          {quote.reminder_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-32 flex justify-center">
                    <Badge className={statusColors[quote.status] || statusColors.draft}>
                      {getStatusLabel(quote.status)}
                    </Badge>
                  </div>

                  {/* Total */}
                  <div className="w-28 text-right">
                    <p className="text-xl font-bold text-cyan-600">
                      ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    {quote.profit_margin && (
                      <p className="text-xs text-green-600">{quote.profit_margin.toFixed(0)}% margin</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 w-48 justify-end" onClick={(e) => e.stopPropagation()}>
                    {quote.status === 'sent' && (
                      <QuoteReminder quote={quote} />
                    )}
                    <QuoteWhatsApp quote={quote} />
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => duplicateMutation.mutate(quote)}
                        className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 h-8 w-8"
                        title={language === 'es' ? 'Duplicar' : 'Duplicate'}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    {isAdmin && quote.status !== 'converted_to_invoice' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (window.confirm(language === 'es' 
                            ? '¿Convertir a factura?' 
                            : 'Convert to invoice?')) {
                            convertToInvoiceMutation.mutate(quote);
                          }
                        }}
                        disabled={convertToInvoiceMutation.isPending}
                        className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 h-8 w-8"
                        title={language === 'es' ? 'Convertir' : 'Convert'}
                      >
                        <FileCheck className="w-3 h-3" />
                      </Button>
                    )}
                    <Link to={createPageUrl(`VerEstimado?id=${quote.id}`)}>
                      <Button variant="outline" size="icon" className="bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700 h-8 w-8">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (window.confirm(language === 'es' ? '¿Eliminar?' : 'Delete?')) {
                            deleteMutation.mutate(quote.id);
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 h-8 w-8"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-white dark:bg-slate-800"
              >
                {language === 'es' ? 'Anterior' : 'Previous'}
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400 px-4">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-white dark:bg-slate-800"
              >
                {language === 'es' ? 'Siguiente' : 'Next'}
              </Button>
            </div>
          )}

          {filteredQuotes.length === 0 && !isLoading && (
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  {hasActiveFilters 
                    ? (language === 'es' ? 'No se encontraron estimados con estos filtros' : 'No quotes found with these filters')
                    : t('noQuotes')}
                </h3>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" className="mt-4">
                    {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                  </Button>
                )}
                {!hasActiveFilters && isAdmin && (
                  <Link to={createPageUrl("CrearEstimado")}>
                    <Button className="mt-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('newQuote')}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        </>
        )}

        {/* Preview Modal */}
        <QuotePreviewModal
          quote={previewQuote}
          open={!!previewQuote}
          onClose={() => setPreviewQuote(null)}
          onConvert={(q) => {
            if (window.confirm(language === 'es' ? '¿Convertir a factura?' : 'Convert to invoice?')) {
              convertToInvoiceMutation.mutate(q);
              setPreviewQuote(null);
            }
          }}
        />
      </div>
    </div>
  );
}