import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Link as LinkIcon, Zap, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentReconciliation() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: unreconciledTransactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['unreconciledTransactions'],
    queryFn: async () => {
      const all = await base44.entities.Transaction.filter({ type: 'income' });
      return all.filter(t => t.reconciliation_status !== 'matched');
    },
    initialData: [],
  });

  const { data: openInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['openInvoices'],
    queryFn: async () => {
      const all = await base44.entities.Invoice.list('-created_date', 500);
      return all.filter(inv => inv.status === 'sent' || inv.status === 'partial');
    },
    initialData: [],
  });

  const autoReconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('auto-reconcile-payments', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['unreconciledTransactions']);
      queryClient.invalidateQueries(['openInvoices']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['invoices']);
      toast({
        title: language === 'es' ? '✓ Auto-Reconciliación Completa' : '✓ Auto-Reconciliation Complete',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async ({ transaction_id, invoice_id }) => {
      const response = await base44.functions.invoke('reconcile-payments', {
        transaction_id,
        invoice_id,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['unreconciledTransactions']);
      queryClient.invalidateQueries(['openInvoices']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['invoices']);
      setSelectedInvoice({});
      toast({
        title: language === 'es' ? '✓ Pago Reconciliado' : '✓ Payment Reconciled',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getSuggestedInvoice = (transaction) => {
    if (!transaction || !openInvoices.length) return null;

    const transactionDate = new Date(transaction.date);
    
    // Find best match by amount and customer name
    const matches = openInvoices.map(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      const daysDiff = Math.abs((transactionDate - invoiceDate) / (1000 * 60 * 60 * 24));
      const amountDiff = Math.abs(transaction.amount - (invoice.balance || invoice.total));
      const customerMatch = transaction.description?.toLowerCase().includes(invoice.customer_name?.toLowerCase());
      
      let score = 0;
      if (amountDiff <= 1) score += 50;
      if (amountDiff <= 10) score += 20;
      if (daysDiff <= 7) score += 20;
      if (daysDiff <= 30) score += 10;
      if (customerMatch) score += 30;
      
      return { invoice, score, amountDiff, daysDiff };
    });
    
    matches.sort((a, b) => b.score - a.score);
    
    return matches[0]?.score > 30 ? matches[0].invoice : null;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
            </h2>
            <p className="text-red-700">
              {language === 'es' 
                ? 'Solo administradores pueden reconciliar pagos.'
                : 'Only administrators can reconcile payments.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Reconciliación de Pagos' : 'Payment Reconciliation'}
          description={language === 'es' 
            ? 'Conecta transacciones bancarias con facturas'
            : 'Match bank transactions with invoices'}
          icon={LinkIcon}
        />

        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm">
              {unreconciledTransactions.length} {language === 'es' ? 'sin reconciliar' : 'unreconciled'}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {openInvoices.length} {language === 'es' ? 'facturas abiertas' : 'open invoices'}
            </Badge>
          </div>
          <Button
            onClick={() => autoReconcileMutation.mutate()}
            disabled={autoReconcileMutation.isPending || unreconciledTransactions.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
          >
            <Zap className={`w-4 h-4 mr-2 ${autoReconcileMutation.isPending ? 'animate-pulse' : ''}`} />
            {autoReconcileMutation.isPending 
              ? (language === 'es' ? 'Auto-Reconciliando...' : 'Auto-Reconciling...') 
              : (language === 'es' ? 'Auto-Reconciliar' : 'Auto-Reconcile')}
          </Button>
        </div>

        {loadingTransactions || loadingInvoices ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : unreconciledTransactions.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {language === 'es' ? '¡Todo Reconciliado!' : 'All Reconciled!'}
              </h3>
              <p className="text-slate-600">
                {language === 'es' 
                  ? 'No hay transacciones pendientes de reconciliar'
                  : 'No unreconciled transactions'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {unreconciledTransactions.map((transaction) => {
              const suggestedInvoice = getSuggestedInvoice(transaction);
              const isStripe = transaction.payment_method === 'stripe';
              const isBank = transaction.payment_method === 'bank_transfer';

              return (
                <Card key={transaction.id} className="shadow-lg border-slate-200">
                  <CardHeader className="border-b border-slate-200 bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-slate-900">${transaction.amount.toFixed(2)}</CardTitle>
                          {isStripe && <Badge className="bg-purple-100 text-purple-700">Stripe</Badge>}
                          {isBank && <Badge className="bg-blue-100 text-blue-700">Bank</Badge>}
                        </div>
                        <p className="text-sm text-slate-600">{transaction.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(transaction.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {suggestedInvoice && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          <Zap className="w-3 h-3 mr-1" />
                          {language === 'es' ? 'Match Sugerido' : 'Suggested Match'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          {language === 'es' ? 'Seleccionar Factura' : 'Select Invoice'}
                        </label>
                        <Select
                          value={selectedInvoice[transaction.id] || (suggestedInvoice?.id || '')}
                          onValueChange={(value) => setSelectedInvoice({ ...selectedInvoice, [transaction.id]: value })}
                        >
                          <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                            <SelectValue placeholder={language === 'es' ? 'Seleccionar factura...' : 'Select invoice...'} />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            {openInvoices.map(invoice => {
                              const balance = invoice.balance || invoice.total;
                              const isSuggested = suggestedInvoice?.id === invoice.id;
                              return (
                                <SelectItem key={invoice.id} value={invoice.id} className="text-slate-900">
                                  <div className="flex items-center justify-between w-full">
                                    <span>
                                      {invoice.invoice_number} - {invoice.customer_name}
                                    </span>
                                    <span className="ml-4 font-semibold">
                                      ${balance.toFixed(2)}
                                    </span>
                                    {isSuggested && <span className="ml-2 text-emerald-600">★</span>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => {
                          const invoiceId = selectedInvoice[transaction.id] || suggestedInvoice?.id;
                          if (invoiceId) {
                            reconcileMutation.mutate({
                              transaction_id: transaction.id,
                              invoice_id: invoiceId,
                            });
                          }
                        }}
                        disabled={reconcileMutation.isPending || (!selectedInvoice[transaction.id] && !suggestedInvoice)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {reconcileMutation.isPending 
                          ? (language === 'es' ? 'Reconciliando...' : 'Reconciling...') 
                          : (language === 'es' ? 'Reconciliar' : 'Reconcile')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}