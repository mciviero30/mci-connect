import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Eye, Trash2, DollarSign, FileSpreadsheet, Download, Copy, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceXLSXImporter from "../components/invoices/InvoiceXLSXImporter";
import InvoicePDFImporter from "../components/invoices/InvoicePDFImporter";

export default function Facturas() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showImporter, setShowImporter] = useState(false);
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
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('deletedSuccessfully'));
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (invoice) => {
      const newInvoice = {
        ...invoice,
        invoice_number: `${invoice.invoice_number}-COPY-${Date.now()}`,
        status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        amount_paid: 0,
        balance: invoice.total,
      };
      delete newInvoice.id;
      delete newInvoice.created_date;
      delete newInvoice.updated_date;
      delete newInvoice.created_by;
      delete newInvoice.payment_date;
      
      return base44.entities.Invoice.create(newInvoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? '✅ Factura duplicada' : '✅ Invoice duplicated');
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const registerPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }) => {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const numericAmount = parseFloat(amount);
      const currentAmountPaid = invoice.amount_paid || 0;
      const newAmountPaid = currentAmountPaid + numericAmount;
      const newBalance = invoice.total - newAmountPaid;

      let newStatus = invoice.status;
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0 && newAmountPaid < invoice.total) {
        newStatus = 'partial';
      } else if (newAmountPaid <= 0 && invoice.total > 0) {
         newStatus = 'sent';
      }

      const updateData = {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      };

      if (newBalance <= 0) {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'partial' && !invoice.payment_date) {
         updateData.payment_date = new Date().toISOString().split('T')[0];
      }

      return base44.entities.Invoice.update(invoiceId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Pago registrado exitosamente' : 'Payment registered successfully');
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleRegisterPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error(language === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    const outstandingBalance = selectedInvoice.balance || selectedInvoice.total;
    if (parseFloat(paymentAmount) > outstandingBalance) {
        toast.error(language === 'es' ? `El monto no puede exceder el saldo pendiente ($${outstandingBalance.toFixed(2)})` : `Amount cannot exceed outstanding balance ($${outstandingBalance.toFixed(2)})`);
        return;
    }

    registerPaymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      amount: paymentAmount
    });
  };

  const exportToExcel = () => {
    if (filteredInvoices.length === 0) {
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
      'Vencimiento',
      'Subtotal',
      'Impuesto %',
      'Impuesto',
      'Total',
      'Pagado',
      'Saldo',
      'Estado',
      'Notas'
    ];

    const rows = filteredInvoices.map(invoice => [
      invoice.invoice_number || '',
      invoice.customer_name || '',
      invoice.customer_email || '',
      invoice.customer_phone || '',
      invoice.job_name || '',
      invoice.job_address || '',
      invoice.invoice_date || '',
      invoice.due_date || '',
      invoice.subtotal || 0,
      invoice.tax_rate || 0,
      invoice.tax_amount || 0,
      invoice.total || 0,
      invoice.amount_paid || 0,
      invoice.balance || 0,
      invoice.status || '',
      (invoice.notes || '').replace(/\n/g, ' ')
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
    link.download = `facturas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('✅ ' + (language === 'es' ? 'Archivo descargado' : 'File downloaded'));
  };

  const getDaysOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || !invoice.due_date) return 0;
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    dueDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? daysDiff : 0;
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

  const filteredInvoices = invoices.filter(invoice => {
    // Basic search
    const matchesSearch = !searchTerm ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.job_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date range filter
    const invoiceDate = new Date(invoice.invoice_date);
    const matchesDateFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || invoiceDate <= new Date(dateTo);

    // Amount range filter
    const matchesMinAmount = !minAmount || (invoice.total || 0) >= parseFloat(minAmount);
    const matchesMaxAmount = !maxAmount || (invoice.total || 0) <= parseFloat(maxAmount);

    // Team filter
    const matchesTeam = teamFilter === "all" || invoice.team_id === teamFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    // Notes keyword filter
    const matchesNotes = !notesKeyword || 
      (invoice.notes && invoice.notes.toLowerCase().includes(notesKeyword.toLowerCase()));

    return matchesSearch && matchesDateFrom && matchesDateTo && 
           matchesMinAmount && matchesMaxAmount && matchesTeam && 
           matchesStatus && matchesNotes;
  });

  const drafts = filteredInvoices.filter(i => i.status === 'draft');
  const paid = filteredInvoices.filter(i => i.status === 'paid');
  const overdue = filteredInvoices.filter(i => i.status === 'overdue');
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalCollected = filteredInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
  const toCollect = totalBilled - totalCollected;

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200"
  };

  const getStatusLabel = (status) => {
    return t(status) || status;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('invoices')}
          description={`${filteredInvoices.length} ${t('total').toLowerCase()}`}
          icon={FileCheck}
          actions={
            isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={exportToExcel}
                  variant="outline"
                  size="lg" 
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                  disabled={filteredInvoices.length === 0}
                >
                  <Download className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Exportar' : 'Export'}
                </Button>
                <Button 
                  onClick={() => setShowImporter(true)}
                  variant="outline"
                  size="lg" 
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Importar' : 'Import'}
                </Button>
                <Link to={createPageUrl("CrearFactura")}>
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('newInvoice')}
                  </Button>
                </Link>
              </div>
            )
          }
        />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('drafts')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{drafts.length}</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('paid')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{paid.length}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-700 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-green-600 dark:text-green-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('overdue')}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{overdue.length}</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-700 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-red-600 dark:text-red-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-blue-50">{t('totalBilled')}</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-green-50">{t('totalCollected')}</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-amber-50">{t('toCollect')}</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${toCollect.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={t('search') + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                        <SelectItem value="paid" className="text-slate-900">
                          {language === 'es' ? 'Pagado' : 'Paid'}
                        </SelectItem>
                        <SelectItem value="partial" className="text-slate-900">
                          {language === 'es' ? 'Parcial' : 'Partial'}
                        </SelectItem>
                        <SelectItem value="overdue" className="text-slate-900">
                          {language === 'es' ? 'Vencido' : 'Overdue'}
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-slate-900">
                          {language === 'es' ? 'Cancelado' : 'Cancelled'}
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
                      ? `Mostrando ${filteredInvoices.length} de ${invoices.length} facturas`
                      : `Showing ${filteredInvoices.length} of ${invoices.length} invoices`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredInvoices.map(invoice => {
            const daysOverdue = getDaysOverdue(invoice);
            const isOverdue = daysOverdue > 0;

            return (
              <Card key={invoice.id} className={`bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white">{invoice.customer_name}</h3>
                        <Badge className={statusColors[invoice.status] || statusColors.draft}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-500 text-white font-bold animate-pulse">
                            {language === 'es' 
                              ? `Vencida por ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}` 
                              : `Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">{invoice.job_name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{invoice.invoice_number}</span>
                        <span>•</span>
                        <span>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
                        {invoice.due_date && (
                          <>
                            <span>•</span>
                            <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                              {t('dueDate')}: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                            </span>
                          </>
                        )}
                        {invoice.team_name && (
                          <>
                            <span>•</span>
                            <span className="text-[#3B9FF3]">Team: {invoice.team_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#3B9FF3] dark:text-blue-400">
                          ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {invoice.amount_paid > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                            {language === 'es' ? 'Pagado' : 'Paid'}: ${invoice.amount_paid.toFixed(2)}
                          </p>
                        )}
                        {invoice.balance > 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {language === 'es' ? 'Saldo' : 'Balance'}: ${invoice.balance.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(language === 'es' ? '¿Duplicar esta factura?' : 'Duplicate this invoice?')) {
                                duplicateMutation.mutate(invoice);
                              }
                            }}
                            className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                            title={language === 'es' ? 'Duplicar' : 'Duplicate'}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && invoice.status !== 'paid' && invoice.total > (invoice.amount_paid || 0) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentAmount(((invoice.balance || invoice.total) > 0 ? (invoice.balance || invoice.total) : 0).toFixed(2));
                              setPaymentDialogOpen(true);
                            }}
                            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                            title={language === 'es' ? 'Registrar Pago' : 'Register Payment'}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        <Link to={createPageUrl(`VerFactura?id=${invoice.id}`)}>
                          <Button variant="outline" size="icon" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(language === 'es' ? '¿Estás seguro de que quieres eliminar esta factura? Esta acción no se puede deshacer.' : 'Are you sure you want to delete this invoice? This action cannot be undone.')) {
                                deleteMutation.mutate(invoice.id);
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
            );
          })}

          {filteredInvoices.length === 0 && !isLoading && (
            <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <FileCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {hasActiveFilters 
                    ? (language === 'es' ? 'No se encontraron facturas con estos filtros' : 'No invoices found with these filters')
                    : t('noInvoices')}
                </h3>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" className="mt-4">
                    {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                  </Button>
                )}
                {!hasActiveFilters && isAdmin && (
                  <Link to={createPageUrl("CrearFactura")}>
                    <Button className="mt-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('newInvoice')}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Dialog */}
        {paymentDialogOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#282828] rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {language === 'es' ? 'Registrar Pago' : 'Register Payment'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {language === 'es' ? 'Factura' : 'Invoice'}: <span className="font-semibold">{selectedInvoice.invoice_number}</span>
              </p>
              <div className="mb-4">
                <Label htmlFor="outstanding-balance" className="text-slate-700 dark:text-slate-300 mb-2 block">{language === 'es' ? 'Saldo Pendiente' : 'Outstanding Balance'}</Label>
                <p id="outstanding-balance" className="text-3xl font-bold text-[#3B9FF3] dark:text-blue-400">
                  ${(selectedInvoice.balance || selectedInvoice.total).toFixed(2)}
                </p>
              </div>
              <div className="mb-6">
                <Label htmlFor="payment-amount" className="text-slate-700 dark:text-slate-300 mb-2 block">{language === 'es' ? 'Monto del Pago' : 'Payment Amount'}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={(selectedInvoice.balance || selectedInvoice.total).toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setSelectedInvoice(null);
                    setPaymentAmount("");
                  }}
                  className="flex-1"
                  disabled={registerPaymentMutation.isPending}
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleRegisterPayment}
                  disabled={registerPaymentMutation.isPending || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (selectedInvoice.balance || selectedInvoice.total)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {registerPaymentMutation.isPending 
                    ? (language === 'es' ? 'Procesando...' : 'Processing...') 
                    : (language === 'es' ? 'Registrar' : 'Register')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import Dialog with Tabs */}
        <Dialog open={showImporter} onOpenChange={setShowImporter}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900">
                {language === 'es' ? 'Importar Facturas' : 'Import Invoices'}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="excel" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="excel" className="text-base">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel/CSV
                </TabsTrigger>
                <TabsTrigger value="pdf" className="text-base">
                  <FileCheck className="w-4 h-4 mr-2" />
                  PDFs (AI)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="excel">
                <InvoiceXLSXImporter onComplete={() => setShowImporter(false)} />
              </TabsContent>
              <TabsContent value="pdf">
                <InvoicePDFImporter onComplete={() => setShowImporter(false)} />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}