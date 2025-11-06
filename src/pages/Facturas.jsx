
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Eye, Trash2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // NEW: Import Label

export default function Facturas() {
  const { t, language } = useLanguage(); // NEW: Destructure 'language'
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false); // NEW: State for payment dialog
  const [selectedInvoice, setSelectedInvoice] = useState(null); // NEW: State for selected invoice
  const [paymentAmount, setPaymentAmount] = useState(""); // NEW: State for payment amount

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('deletedSuccessfully'));
    }
  });

  // NEW: Payment mutation
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
      } else if (newAmountPaid <= 0 && invoice.total > 0) { // If payment was somehow 0 or less, but there's a total
         newStatus = 'sent'; // Revert to sent if no payment is registered, might need specific logic here
      }

      const updateData = {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      };

      if (newBalance <= 0) {
        updateData.payment_date = new Date().toISOString().split('T')[0]; // Set payment date if fully paid
      } else if (newStatus === 'partial' && !invoice.payment_date) {
         updateData.payment_date = new Date().toISOString().split('T')[0]; // Set payment date on first partial payment
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

  // NEW: Handler for registering payment
  const handleRegisterPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error(language === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    // Ensure the amount does not exceed the outstanding balance
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

  // NEW: Helper function to calculate days overdue
  const getDaysOverdue = (invoice) => {
    // Only calculate for 'sent' or 'overdue' invoices that are not paid or cancelled
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || !invoice.due_date) return 0;
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    // Set hours, minutes, seconds, milliseconds to 0 for accurate day comparison
    dueDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.job_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Helper function for status label (used in badge)
  const getStatusLabel = (status) => {
    return t(status) || status;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50"> {/* Changed background gradient */}
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('invoices')}
          description={`${filteredInvoices.length} ${t('total').toLowerCase()}`}
          icon={FileCheck}
          actions={
            isAdmin && (
              <Link to={createPageUrl("CrearFactura")}>
                <Button size="lg" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('newInvoice')}
                </Button>
              </Link>
            )
          }
        />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('drafts')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{drafts.length}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('paid')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{paid.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('overdue')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{overdue.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-2xl">
                  <FileCheck className="w-6 h-6 text-red-600" />
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

        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-6">
          <CardContent className="p-4">
            <Input
              placeholder={t('search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredInvoices.map(invoice => {
            const daysOverdue = getDaysOverdue(invoice);
            const isOverdue = daysOverdue > 0;

            return (
              <Card key={invoice.id} className={`bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all group ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap"> {/* Added flex-wrap */}
                        <h3 className="font-bold text-xl text-slate-900">{invoice.customer_name}</h3>
                        <Badge className={statusColors[invoice.status] || statusColors.draft}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                        {/* NEW: Overdue Alert */}
                        {isOverdue && (
                          <Badge className="bg-red-500 text-white font-bold animate-pulse">
                            {language === 'es' 
                              ? `Vencida por ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}` 
                              : `Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium mb-1">{invoice.job_name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap"> {/* Added flex-wrap */}
                        <span>{invoice.invoice_number}</span>
                        <span>•</span>
                        <span>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
                        {invoice.due_date && ( // Only show due date if it exists
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
                        <p className="text-2xl font-bold text-[#3B9FF3]">
                          ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {invoice.amount_paid > 0 && (
                          <p className="text-sm text-green-600 font-semibold">
                            {language === 'es' ? 'Pagado' : 'Paid'}: ${invoice.amount_paid.toFixed(2)}
                          </p>
                        )}
                        {invoice.balance > 0 && (
                          <p className="text-sm text-slate-500">
                            {language === 'es' ? 'Saldo' : 'Balance'}: ${invoice.balance.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* NEW: Quick Payment Button */}
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
                          <Button variant="outline" size="icon" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"> {/* Changed button color */}
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
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">{t('noInvoices')}</h3>
                {isAdmin && (
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

        {/* NEW: Payment Dialog */}
        {paymentDialogOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {language === 'es' ? 'Registrar Pago' : 'Register Payment'}
              </h3>
              <p className="text-slate-600 mb-4">
                {language === 'es' ? 'Factura' : 'Invoice'}: <span className="font-semibold">{selectedInvoice.invoice_number}</span>
              </p>
              <div className="mb-4">
                <Label htmlFor="outstanding-balance" className="text-slate-700 mb-2 block">{language === 'es' ? 'Saldo Pendiente' : 'Outstanding Balance'}</Label>
                <p id="outstanding-balance" className="text-3xl font-bold text-[#3B9FF3]">
                  ${(selectedInvoice.balance || selectedInvoice.total).toFixed(2)}
                </p>
              </div>
              <div className="mb-6">
                <Label htmlFor="payment-amount" className="text-slate-700 mb-2 block">{language === 'es' ? 'Monto del Pago' : 'Payment Amount'}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={(selectedInvoice.balance || selectedInvoice.total).toFixed(2)} // Set max to outstanding balance
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
      </div>
    </div>
  );
}
