
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Trash2, Copy, FileCheck, Download, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Estimados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesKeyword, setNotesKeyword] = useState("");

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
    if (filteredQuotes.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para exportar' : '⚠️ No data to export');
      return;
    }

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

    const rows = filteredQuotes.map(quote => [
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

  const filteredQuotes = quotes.filter(quote => {
    // Basic search
    const matchesSearch = !searchTerm ||
      quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.job_name?.toLowerCase().includes(searchTerm.toLowerCase());

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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('quotes')}
          description={`${filteredQuotes.length} ${t('total').toLowerCase()}`}
          icon={FileText}
          actions={
            isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={exportToExcel}
                  variant="outline"
                  size="lg" 
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                  disabled={filteredQuotes.length === 0}
                >
                  <Download className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Exportar' : 'Export'}
                </Button>
                <Link to={createPageUrl("CrearEstimado")}>
                  <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('newQuote')}
                  </Button>
                </Link>
              </div>
            )
          }
        />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t('drafts')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{drafts.length}</p>
                </div>
                <div className="p-3 bg-slate-200 rounded-2xl">
                  <FileText className="w-6 h-6 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t('sent')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{sent.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t('converted')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{converted.length}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-white">{t('totalValue')}</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={t('search') + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                className={showFilters ? "bg-[#3B9FF3] text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}
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
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <Label className="text-slate-700 font-medium mb-2 block">
                      {language === 'es' ? 'Fecha Desde' : 'Date From'}
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
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

        <div className="space-y-4">
          {filteredQuotes.map(quote => (
            <Card key={quote.id} className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all group">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-xl text-slate-900">{quote.customer_name}</h3>
                      <Badge className={statusColors[quote.status] || statusColors.draft}>
                        {getStatusLabel(quote.status)}
                      </Badge>
                      {quote.status === 'converted_to_invoice' && quote.invoice_id && (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          <FileCheck className="w-3 h-3 mr-1" />
                          {language === 'es' ? 'Ver Factura' : 'View Invoice'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 font-medium mb-1">{quote.job_name}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      <span>{quote.quote_number}</span>
                      <span>•</span>
                      <span>{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</span>
                      {quote.team_name && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-600">Team: {quote.team_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-600">
                        ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(language === 'es' ? '¿Duplicar este estimado?' : 'Duplicate this quote?')) {
                              duplicateMutation.mutate(quote);
                            }
                          }}
                          className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                          title={language === 'es' ? 'Duplicar' : 'Duplicate'}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && quote.status !== 'converted_to_invoice' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(language === 'es' 
                              ? '¿Convertir este estimado a factura? Esto creará automáticamente un trabajo en MCI Connect y MCI Field.' 
                              : 'Convert this quote to invoice? This will automatically create a job in MCI Connect and MCI Field.')) {
                              convertToInvoiceMutation.mutate(quote);
                            }
                          }}
                          disabled={convertToInvoiceMutation.isPending}
                          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          title={language === 'es' ? 'Convertir a Factura' : 'Convert to Invoice'}
                        >
                          <FileCheck className="w-4 h-4" />
                        </Button>
                      )}
                      {quote.status === 'converted_to_invoice' && quote.invoice_id && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(createPageUrl(`VerFactura?id=${quote.invoice_id}`))}
                          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          title={language === 'es' ? 'Ver Factura' : 'View Invoice'}
                        >
                          <FileCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Link to={createPageUrl(`VerEstimado?id=${quote.id}`)}>
                        <Button variant="outline" size="icon" className="bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(language === 'es' ? '¿Estás seguro de que quieres eliminar este estimado? Esta acción no se puede deshacer.' : 'Are you sure you want to delete this quote? This action cannot be undone.')) {
                              deleteMutation.mutate(quote.id);
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

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
      </div>
    </div>
  );
}
