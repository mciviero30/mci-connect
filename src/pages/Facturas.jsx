import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSmartPagination, PaginationControls } from "@/components/hooks/useSmartPagination";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";
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
import CreateJobFromInvoiceDialog from "../components/trabajos/CreateJobFromInvoiceDialog";
import ExcelExporter, { transformInvoicesForExport } from "@/components/shared/ExcelExporter";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { FileSpreadsheet } from "lucide-react";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import SavedFilters from "@/components/shared/SavedFilters";
import CompactListView from "@/components/shared/CompactListView";

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
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [selectedInvoiceForJob, setSelectedInvoiceForJob] = useState(null);
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

  // Mutation: Create Job + Work Authorization
  const createJobFromInvoiceMutation = useMutation({
    mutationFn: async (formData) => {
      // 1. Create Work Authorization
      const workAuth = await base44.entities.WorkAuthorization.create({
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        authorization_type: formData.authorization_type,
        approval_source: formData.approval_source,
        authorization_number: formData.authorization_number || '',
        approved_amount: formData.approved_amount,
        approved_at: new Date().toISOString(),
        verified_by_user_id: formData.verified_by_user_id,
        verified_by_email: formData.verified_by_email,
        verified_by_name: formData.verified_by_name,
        verification_notes: formData.verification_notes,
        status: 'approved',
      });

      // 2. Create Job (with field_project_id to make it visible in Field immediately)
      const job = await base44.entities.Job.create({
        name: formData.job_name,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        authorization_id: workAuth.id,
        contract_amount: formData.approved_amount,
        billing_type: formData.authorization_type === 'tm' ? 'time_materials' : 'fixed_price',
        status: 'active',
        field_project_id: `field_${Date.now()}`, // Make visible in Field immediately
        approval_status: 'approved',
        approved_by: user?.email,
        approved_at: new Date().toISOString(),
      });

      return { workAuth, job };
    },
    onSuccess: (data) => {
      // Invalidate all job-related queries including Field
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['field-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast({
        title: language === 'es' ? '✅ Trabajo creado y enviado a Field' : '✅ Job created and sent to Field',
        description: language === 'es' 
          ? 'El trabajo ya está disponible en MCI Field.'
          : 'Job is now available in MCI Field.',
        variant: 'success'
      });
      setCreateJobDialogOpen(false);
      setSelectedInvoiceForJob(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: safeErrorMessage(error, language === 'es' ? 'Error al crear trabajo' : 'Failed to create job'),
        variant: 'destructive'
      });
    }
  });
  // Smart pagination for invoices — don't filter deleted_at server-side (undefined != null)
  const paginationFilters = {};
  if (statusFilter !== 'all') paginationFilters.status = statusFilter;
  if (teamFilter !== 'all') paginationFilters.team_id = teamFilter;

  const {
    items: invoices = [],
    isLoading,
    page,
    hasMore,
    hasPrevious,
    nextPage,
    prevPage,
    resetPagination
  } = useSmartPagination({
    entityName: 'Invoice',
    filters: paginationFilters,
    sortBy: '-created_date',
    pageSize: 18,
    enabled: !!user?.id
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // I3 FIX: user is always present (comes from enabled query), no fallback needed
      await base44.entities.Invoice.update(id, {
        deleted_at: new Date().toISOString(),
        deleted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      resetPagination();
      toast({
        title: language === 'es' ? 'Movido a papelera' : 'Moved to trash',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, language === 'es' ? 'Movido a papelera' : 'Moved to trash');
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
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        amount_paid: 0,
        balance: invoice.total,
        created_by_user_id: user?.id,
        approval_status: 'approved',
        approved_by: user?.email,
        approved_at: new Date().toISOString()
      };
      delete newInvoice.id;
      delete newInvoice.created_date;
      delete newInvoice.updated_date;
      delete newInvoice.created_by;
      delete newInvoice.payment_date;
      delete newInvoice.transaction_id;
      
      return base44.entities.Invoice.create(newInvoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      resetPagination();
      toast({
        title: language === 'es' ? '✅ Factura duplicada' : '✅ Invoice duplicated',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, language === 'es' ? '✅ Factura duplicada' : '✅ Invoice duplicated');
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
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      resetPagination();
      toast({
        title: language === 'es' ? 'Pago registrado exitosamente' : 'Payment registered successfully',
        variant: 'success'
      });
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount("");
    },
    onError: (error) => {
      handleError(error, language === 'es' ? 'Pago registrado' : 'Payment registered');
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
    console.log('[Facturas] Query state:', { userLoaded: !!user?.id, invoicesCount: invoices?.length || 0, isLoading });
    safeInvoices.forEach(inv => {
      const bad = !inv.invoice_number || !Array.isArray(inv.items);
      if (bad) console.warn("[Bad invoice record]", inv?.id, inv);
    });
  }

  const filteredInvoices = safeInvoices.filter(invoice => {
    // Exclude soft-deleted invoices on the frontend
    if (invoice.deleted_at) return false;

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
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <ExcelExporter
                  data={filteredInvoices}
                  filename="invoices"
                  sheetName="Invoices"
                  transformData={transformInvoicesForExport}
                  buttonText={language === 'es' ? 'Excel' : 'Excel'}
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-600 hover:bg-green-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("Papelera"))}
                  className="h-10 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Papelera' : 'Trash'}
                </Button>
                <InvoicePDFImporter onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />
                <Link to={createPageUrl("CrearFactura")}>
                  <Button className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t('newInvoice')}</span>
                    <span className="sm:hidden">{language === 'es' ? 'Nueva' : 'New'}</span>
                  </Button>
                </Link>
              </div>
            )
          }
        />

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
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
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        <div className="mb-4">
          <SavedFilters
            page="invoices"
            currentFilters={{ searchTerm, statusFilter, teamFilter }}
            onApplyFilter={(filters) => {
              if (filters.searchTerm) setSearchTerm(filters.searchTerm);
              if (filters.statusFilter) setStatusFilter(filters.statusFilter);
              if (filters.teamFilter) setTeamFilter(filters.teamFilter);
            }}
            user={user}
          />
        </div>

        {/* Invoices Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            <SkeletonDocumentList count={6} />
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
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
                  onCreateJob={(inv) => {
                    setSelectedInvoiceForJob(inv);
                    setCreateJobDialogOpen(true);
                  }}
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
              items={filteredInvoices}
              entityType="invoice"
              user={user}
              getTitle={(invoice) => invoice.customer_name}
              getSubtitle={(invoice) => `${invoice.invoice_number} • ${invoice.job_name}`}
              getBadges={(invoice) => (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  invoice.status === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                  invoice.status === 'sent' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  invoice.status === 'overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  {getInvoiceStatusMeta(invoice.status, language).label}
                </span>
              )}
              getAmount={(invoice) => `$${invoice.total?.toLocaleString() || 0}`}
              onItemClick={(invoice) => navigate(createPageUrl(`VerFactura?id=${invoice.id}`))}
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

        {filteredInvoices.length === 0 && !isLoading && (
          <Card className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
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

        {/* Create Job from Invoice Dialog */}
        <CreateJobFromInvoiceDialog
          open={createJobDialogOpen}
          onOpenChange={setCreateJobDialogOpen}
          invoice={selectedInvoiceForJob}
          user={user}
          isLoading={createJobFromInvoiceMutation.isPending}
          onSubmit={(formData) => createJobFromInvoiceMutation.mutate(formData)}
        />

        {/* Payment Dialog */}
         {paymentDialogOpen && paymentInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
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