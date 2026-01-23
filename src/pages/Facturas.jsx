import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Eye, Trash2, DollarSign, Copy, Search, X, MapPin, Users, Trash as TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeErrorMessage } from "@/components/utils/safeErrorMessage";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import FilterBar from "../components/shared/FilterBar";
import { Dialog } from "@/components/ui/dialog";
import ModernInvoiceCard from "../components/invoices/ModernInvoiceCard";
import InvoicePDFImporter from "../components/invoices/InvoicePDFImporter";
import { getInvoiceStatusMeta } from "../components/core/statusConfig";
import { SkeletonDocumentList } from "@/components/shared/SkeletonComponents";
import { useNavigate } from "react-router-dom";

export default function Facturas() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, teamFilter],
    queryFn: async () => {
      const filters = { deleted_at: null };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (teamFilter !== 'all') filters.team_id = teamFilter;
      
      return base44.entities.Invoice.filter(filters, 'invoice_number');
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const user = await base44.auth.me();
      await base44.entities.Invoice.update(id, {
        deleted_at: new Date().toISOString(),
        deleted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: language === 'es' ? 'Movido a papelera' : 'Moved to trash',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to delete invoice'),
        variant: 'destructive'
      });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (invoice) => {
      // Use atomic number generator to prevent duplicates
      const response = await base44.functions.invoke('generateInvoiceNumber', {});
      const newInvoiceNumber = response?.data?.invoice_number || response?.invoice_number;
      
      if (!newInvoiceNumber) {
        throw new Error('Failed to generate invoice number');
      }
      
      const newInvoice = {
        ...invoice,
        invoice_number: newInvoiceNumber,
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
      toast({
        title: language === 'es' ? '✅ Factura duplicada' : '✅ Invoice duplicated',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error duplicating invoice:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to duplicate invoice'),
        variant: 'destructive'
      });
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
      toast({
        title: language === 'es' ? 'Pago registrado exitosamente' : 'Payment registered successfully',
        variant: 'success'
      });
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount("");
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to record payment'),
        variant: 'destructive'
      });
    }
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

  // Defensive normalization - prevent crashes from legacy invoices
  const safeInvoices = (invoices || []).map(inv => {
    // GUARDRAIL 1️⃣: Validate invoice_number format (INV-00001 format)
    const rawNumber = inv?.invoice_number || inv?.number || '';
    const isValidFormat = /^INV-\d{5}$/.test(rawNumber);
    
    if (import.meta.env.DEV && !isValidFormat && rawNumber) {
      console.warn(`[HARDENING] Invalid invoice number format: "${rawNumber}" (should be INV-XXXXX)`, { invoice_id: inv?.id });
    }

    return {
    ...inv,
    invoice_number: isValidFormat ? rawNumber : (rawNumber || 'DRAFT'),
    customer_name: inv?.customer_name || 'N/A',
    status: inv?.status || 'draft',
    total: Number(inv?.total) || 0,
    subtotal: Number(inv?.subtotal) || 0,
    tax_amount: Number(inv?.tax_amount) || 0,
    tax_rate: Number(inv?.tax_rate) || 0,
    amount_paid: Number(inv?.amount_paid) || 0,
    balance: Number(inv?.balance) || Math.max(0, (Number(inv?.total)||0) - (Number(inv?.amount_paid)||0)),
    items: Array.isArray(inv?.items) ? inv.items : [],
    job_id: inv?.job_id || null,
    drive_folder_url: inv?.drive_folder_url || null,
    field_project_id: inv?.field_project_id || null
    };
  });

  // Log bad invoices in DEV
  if (import.meta.env.DEV) {
    safeInvoices.forEach(inv => {
      const bad = !inv.invoice_number || !Array.isArray(inv.items);
      if (bad) console.warn("[Bad invoice record]", inv?.id, inv);
    });
  }

  const filteredInvoices = safeInvoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      invoice.customer_name?.toLowerCase().includes(searchLower) ||
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.job_name?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesTeam = teamFilter === 'all' || invoice.team_id === teamFilter;

    return matchesSearch && matchesStatus && matchesTeam;
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

  // Memoize status filters
  const { draftInvoices, sentInvoices, paidInvoices, overdueInvoices } = useMemo(() => ({
    draftInvoices: filteredInvoices.filter(inv => inv.status === 'draft'),
    sentInvoices: filteredInvoices.filter(inv => inv.status === 'sent'),
    paidInvoices: filteredInvoices.filter(inv => inv.status === 'paid'),
    overdueInvoices: filteredInvoices.filter(inv => getDaysOverdue(inv) > 0)
  }), [filteredInvoices]);



  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('invoices')}
          description={`${draftInvoices.length} ${t('drafts').toLowerCase()}, ${sentInvoices.length} ${t('sent').toLowerCase()}, ${paidInvoices.length} ${t('paid').toLowerCase()}`}
          icon={FileCheck}
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
                <InvoicePDFImporter onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />
                <Link to={createPageUrl("CrearFactura")} className="flex-1 sm:flex-none">
                  <Button className="w-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px]">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">{t('newInvoice')}</span>
                    <span className="sm:hidden">{language === 'es' ? 'Nueva' : 'New'}</span>
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
            { value: 'draft', label: getInvoiceStatusMeta('draft', language).label, dotClass: getInvoiceStatusMeta('draft', language).dotClass },
            { value: 'sent', label: getInvoiceStatusMeta('sent', language).label, dotClass: getInvoiceStatusMeta('sent', language).dotClass },
            { value: 'paid', label: getInvoiceStatusMeta('paid', language).label, dotClass: getInvoiceStatusMeta('paid', language).dotClass },
            { value: 'partial', label: getInvoiceStatusMeta('partial', language).label, dotClass: getInvoiceStatusMeta('partial', language).dotClass },
            { value: 'overdue', label: getInvoiceStatusMeta('overdue', language).label, dotClass: getInvoiceStatusMeta('overdue', language).dotClass }
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

        {/* Invoices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {isLoading ? (
            <SkeletonDocumentList count={6} />
          ) : (
            filteredInvoices.map(invoice => (
              <ModernInvoiceCard
                key={invoice.id}
                invoice={invoice}
                onDuplicate={(inv) => duplicateMutation.mutate(inv)}
                onDelete={(inv) => deleteMutation.mutate(inv.id)}
                onRegisterPayment={(inv) => {
                  setPaymentInvoice(inv);
                  setPaymentAmount(((inv.balance || inv.total) > 0 ? (inv.balance || inv.total) : 0).toFixed(2));
                  setPaymentDialogOpen(true);
                }}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>

        {filteredInvoices.length === 0 && !isLoading && (
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {invoices.length === 0 ? t('noInvoices') : (language === 'es' ? 'No se encontraron facturas' : 'No invoices found')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {invoices.length === 0
                  ? (language === 'es' ? 'Comienza creando tu primera factura' : 'Start by creating your first invoice')
                  : (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
                }
              </p>
              {isAdmin && invoices.length === 0 && (
                <Link to={createPageUrl("CrearFactura")}>
                  <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newInvoice')}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

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
                <p className="text-3xl font-bold text-[#507DB4] dark:text-[#6B9DD8]">
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
                  className="flex-1 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {registerPaymentMutation.isPending ? (language === 'es' ? 'Procesando...' : 'Processing...') : (language === 'es' ? 'Registrar' : 'Register')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}