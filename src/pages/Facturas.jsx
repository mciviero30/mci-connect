import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Eye, Trash2, DollarSign, Copy, Search, X, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import { Dialog } from "@/components/ui/dialog";
import ModernInvoiceCard from "../components/invoices/ModernInvoiceCard";

export default function Facturas() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
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
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
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
      // Get all invoices to find the next number
      const allInvoices = await base44.entities.Invoice.list();
      const existingNumbers = allInvoices
        .map(inv => inv.invoice_number)
        .filter(n => n?.startsWith('INV-'))
        .map(n => parseInt(n.replace('INV-', '')))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const newInvoiceNumber = `INV-${String(nextNumber).padStart(5, '0')}`;
      
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

  const filteredInvoices = invoices.filter(invoice => {
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

  const draftInvoices = filteredInvoices.filter(inv => inv.status === 'draft');
  const sentInvoices = filteredInvoices.filter(inv => inv.status === 'sent');
  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid');
  const overdueInvoices = filteredInvoices.filter(inv => getDaysOverdue(inv) > 0);

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200"
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: language === 'es' ? 'Borrador' : 'Draft',
      sent: language === 'es' ? 'Enviado' : 'Sent',
      paid: language === 'es' ? 'Pagado' : 'Paid',
      partial: language === 'es' ? 'Parcial' : 'Partial',
      overdue: language === 'es' ? 'Vencido' : 'Overdue',
      cancelled: language === 'es' ? 'Cancelado' : 'Cancelled',
    };
    return labels[status] || status;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F1F5F9] dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('invoices')}
          description={`${draftInvoices.length} ${t('drafts').toLowerCase()}, ${sentInvoices.length} ${t('sent').toLowerCase()}, ${paidInvoices.length} ${t('paid').toLowerCase()}`}
          icon={FileCheck}
          actions={
            isAdmin && (
              <Link to={createPageUrl("CrearFactura")}>
                <Button size="lg" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('newInvoice')}
                </Button>
              </Link>
            )
          }
        />

        {/* Filter Bar */}
        <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Text Search */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {language === 'es' ? 'Buscar' : 'Search'}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <Input
                    placeholder={language === 'es' ? 'Buscar por cliente, número o trabajo...' : 'Search by customer, number or job...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {language === 'es' ? 'Estado' : 'Status'}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">
                      {language === 'es' ? 'Todos los Estados' : 'All Status'}
                    </SelectItem>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        {language === 'es' ? 'Borrador' : 'Draft'}
                      </div>
                    </SelectItem>
                    <SelectItem value="sent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        {language === 'es' ? 'Enviado' : 'Sent'}
                      </div>
                    </SelectItem>
                    <SelectItem value="paid">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {language === 'es' ? 'Pagado' : 'Paid'}
                      </div>
                    </SelectItem>
                    <SelectItem value="partial">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        {language === 'es' ? 'Parcial' : 'Partial'}
                      </div>
                    </SelectItem>
                    <SelectItem value="overdue">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        {language === 'es' ? 'Vencido' : 'Overdue'}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Filter */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {language === 'es' ? 'Equipo' : 'Team'}
                </Label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">
                      {language === 'es' ? 'Todos los Equipos' : 'All Teams'}
                    </SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {team.team_name} - {team.location}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters button */}
            {(searchTerm || statusFilter !== 'all' || teamFilter !== 'all') && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTeamFilter('all');
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map(invoice => (
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
          ))}
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