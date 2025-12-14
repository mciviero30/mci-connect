import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Eye, Trash2, DollarSign, FileSpreadsheet, Download, Copy, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import InvoiceDocument from "@/components/documentos/InvoiceDocument";

export default function Facturas() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Advanced filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
      if (selectedInvoice?.id === deleteMutation.variables) {
        setSelectedInvoice(null);
      }
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
      }

      const updateData = {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      };

      if (newBalance <= 0) {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }

      return base44.entities.Invoice.update(invoiceId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Pago registrado exitosamente' : 'Payment registered successfully');
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount("");
    },
  });

  const handleRegisterPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error(language === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    registerPaymentMutation.mutate({
      invoiceId: paymentInvoice.id,
      amount: paymentAmount
    });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setTeamFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = dateFrom || dateTo || minAmount || maxAmount || teamFilter !== "all" || statusFilter !== "all";

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.job_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const invoiceDate = new Date(invoice.invoice_date);
    const matchesDateFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || invoiceDate <= new Date(dateTo);
    const matchesMinAmount = !minAmount || (invoice.total || 0) >= parseFloat(minAmount);
    const matchesMaxAmount = !maxAmount || (invoice.total || 0) <= parseFloat(maxAmount);
    const matchesTeam = teamFilter === "all" || invoice.team_id === teamFilter;
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesDateFrom && matchesDateTo && 
           matchesMinAmount && matchesMaxAmount && matchesTeam && matchesStatus;
  });

  const getDaysOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || !invoice.due_date) return 0;
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    dueDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      {/* Header */}
      <div className="border-b bg-white dark:bg-[#1a1a1a] sticky top-0 z-10">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('invoices')}</h1>
              <p className="text-slate-600 dark:text-slate-400">{filteredInvoices.length} {t('total').toLowerCase()}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    if (!selectedInvoice) {
                      toast.error(language === 'es' ? '⚠️ Selecciona una factura para exportar' : '⚠️ Select an invoice to export');
                      return;
                    }
                    
                    const { generateOptimizedPDF } = await import('../components/utils/pdfGenerator');
                    const filename = `${selectedInvoice.invoice_number} - ${selectedInvoice.customer_name}`;
                    
                    try {
                      await generateOptimizedPDF('invoice-preview-for-pdf', filename);
                      toast.success(language === 'es' ? 'PDF descargado exitosamente' : 'PDF downloaded successfully');
                    } catch (error) {
                      console.error('PDF generation error:', error);
                      toast.error(language === 'es' ? 'Error generando PDF' : 'Error generating PDF');
                    }
                  }}
                  variant="outline" 
                  size="sm" 
                  disabled={!selectedInvoice}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'PDF' : 'PDF'}
                </Button>
                <Link to={createPageUrl("CrearFactura")}>
                  <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newInvoice')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Sidebar + Preview */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-white dark:bg-[#1a1a1a] flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <Input
              placeholder={t('search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                    <SelectItem value="paid">{language === 'es' ? 'Pagado' : 'Paid'}</SelectItem>
                    <SelectItem value="partial">{language === 'es' ? 'Parcial' : 'Partial'}</SelectItem>
                    <SelectItem value="overdue">{language === 'es' ? 'Vencido' : 'Overdue'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Invoice List */}
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
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{hasActiveFilters ? (language === 'es' ? 'No hay resultados' : 'No results') : t('noInvoices')}</p>
              </div>
            ) : (
              filteredInvoices.map(invoice => {
                const daysOverdue = getDaysOverdue(invoice);
                return (
                  <div
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      selectedInvoice?.id === invoice.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''
                    } ${daysOverdue > 0 ? 'border-l-4 border-l-red-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{invoice.customer_name}</h3>
                      <Badge className={statusColors[invoice.status]}>{getStatusLabel(invoice.status)}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-1">{invoice.job_name}</p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">{invoice.invoice_number}</span>
                      <span className="font-bold text-blue-600">${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.due_date && (
                      <div className="text-xs text-slate-500">
                        {daysOverdue > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {language === 'es' ? `Vencida ${daysOverdue}d` : `Overdue ${daysOverdue}d`}
                          </span>
                        ) : (
                          <span>{language === 'es' ? 'Vence' : 'Due'}: {format(new Date(invoice.due_date), 'MMM d')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-slate-50 dark:bg-[#181818] overflow-y-auto">
          {selectedInvoice ? (
            <div className="max-w-4xl mx-auto p-6">
              {/* Actions Bar */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedInvoice.invoice_number}</h2>
                  <Badge className={statusColors[selectedInvoice.status]}>{getStatusLabel(selectedInvoice.status)}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate(selectedInvoice)}>
                      <Copy className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Duplicar' : 'Duplicate'}
                    </Button>
                    {selectedInvoice.status !== 'paid' && selectedInvoice.total > (selectedInvoice.amount_paid || 0) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentInvoice(selectedInvoice);
                          setPaymentAmount(((selectedInvoice.balance || selectedInvoice.total) > 0 ? (selectedInvoice.balance || selectedInvoice.total) : 0).toFixed(2));
                          setPaymentDialogOpen(true);
                        }}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Pago' : 'Payment'}
                      </Button>
                    )}
                    <Link to={createPageUrl(`VerFactura?id=${selectedInvoice.id}`)}>
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
                          deleteMutation.mutate(selectedInvoice.id);
                        }
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Invoice Document */}
              <div id="invoice-preview-for-pdf" className="bg-white dark:bg-[#282828] rounded-lg shadow-xl">
                <InvoiceDocument invoice={selectedInvoice} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{language === 'es' ? 'Selecciona una factura para ver los detalles' : 'Select an invoice to view details'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      {paymentDialogOpen && paymentInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#282828] rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {language === 'es' ? 'Registrar Pago' : 'Register Payment'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {language === 'es' ? 'Factura' : 'Invoice'}: <span className="font-semibold">{paymentInvoice.invoice_number}</span>
            </p>
            <div className="mb-4">
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">{language === 'es' ? 'Saldo Pendiente' : 'Outstanding Balance'}</Label>
              <p className="text-3xl font-bold text-blue-600">
                ${(paymentInvoice.balance || paymentInvoice.total).toFixed(2)}
              </p>
            </div>
            <div className="mb-6">
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">{language === 'es' ? 'Monto del Pago' : 'Payment Amount'}</Label>
              <Input
                type="number"
                step="0.01"
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
                  setPaymentInvoice(null);
                  setPaymentAmount("");
                }}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleRegisterPayment}
                disabled={registerPaymentMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {registerPaymentMutation.isPending ? (language === 'es' ? 'Procesando...' : 'Processing...') : (language === 'es' ? 'Registrar' : 'Register')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}