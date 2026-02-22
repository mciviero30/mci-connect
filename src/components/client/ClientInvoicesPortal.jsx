import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  Eye,
  FileText,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'sonner';

export default function ClientInvoicesPortal({ customerEmail }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch all invoices for this customer
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['client-all-invoices', customerEmail],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.filter({ customer_email: customerEmail }, '-invoice_date', 100);
      return allInvoices;
    },
    enabled: !!customerEmail,
  });

  // Mutation to approve invoice
  const approveMutation = useMutation({
    mutationFn: async (invoiceId) => {
      await base44.functions.invoke('approveInvoiceByToken', { invoiceId, tokenValidation: false });
    },
    onSuccess: () => {
      toast.success(language === 'es' ? '✅ Factura aprobada' : '✅ Invoice approved');
      queryClient.invalidateQueries({ queryKey: ['client-all-invoices', customerEmail] });
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast.error(language === 'es' ? 'Error al aprobar' : 'Error approving invoice');
    },
  });

  // Filter and search
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inv.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  // Calculate summaries
  const summaries = useMemo(() => {
    return {
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
      totalPaid: invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
      totalDue: invoices.reduce((sum, inv) => {
        const balance = (inv.total || 0) - (inv.amount_paid || 0);
        return inv.status !== 'paid' && inv.status !== 'cancelled' ? sum + balance : sum;
      }, 0),
      pendingApproval: invoices.filter(inv => inv.approval_status === 'pending_approval').length,
      approved: invoices.filter(inv => inv.customer_approved).length,
    };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-[#507DB4] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{language === 'es' ? 'Total' : 'Total'}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">${summaries.totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">{language === 'es' ? 'Pagado' : 'Paid'}</p>
            <p className="text-2xl font-bold text-green-700 mt-2">${summaries.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{language === 'es' ? 'Adeudado' : 'Due'}</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">${summaries.totalDue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">{language === 'es' ? 'Por Aprobar' : 'Pending'}</p>
            <p className="text-2xl font-bold text-purple-700 mt-2">{summaries.pendingApproval}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{language === 'es' ? 'Aprobadas' : 'Approved'}</p>
            <p className="text-2xl font-bold text-blue-700 mt-2">{summaries.approved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={language === 'es' ? 'Buscar por #factura, trabajo...' : 'Search by invoice #, job...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-300"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-white border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">{language === 'es' ? 'Todos' : 'All Status'}</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">{language === 'es' ? 'Enviada' : 'Sent'}</SelectItem>
            <SelectItem value="paid">{language === 'es' ? 'Pagada' : 'Paid'}</SelectItem>
            <SelectItem value="partial">{language === 'es' ? 'Parcial' : 'Partial'}</SelectItem>
            <SelectItem value="overdue">{language === 'es' ? 'Vencida' : 'Overdue'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{language === 'es' ? 'Sin facturas' : 'No invoices found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const balance = (invoice.total || 0) - (invoice.amount_paid || 0);
            const isPaid = invoice.status === 'paid';
            const isApproved = invoice.customer_approved;

            return (
              <Card key={invoice.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-bold text-slate-900">{invoice.invoice_number}</h4>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={`text-xs px-2 py-0.5 ${
                            isPaid ? 'soft-green-gradient' :
                            invoice.status === 'partial' ? 'soft-amber-gradient' :
                            invoice.status === 'overdue' ? 'soft-red-gradient' :
                            'soft-blue-gradient'
                          }`}>
                            {isPaid ? '💰 Paid' : 
                             invoice.status === 'partial' ? '⚙️ Partial' :
                             invoice.status === 'overdue' ? '⚠️ Overdue' : 
                             invoice.status === 'draft' ? '📝 Draft' : 'Sent'}
                          </Badge>
                          {isApproved && (
                            <Badge className="soft-green-gradient text-xs px-2 py-0.5">
                              ✅ Approved
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mb-3">
                        {invoice.job_name} • {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">{language === 'es' ? 'Cantidad' : 'Amount'}</p>
                          <p className="font-bold text-slate-900">${(invoice.total || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">{language === 'es' ? 'Pagado' : 'Paid'}</p>
                          <p className="font-bold text-green-600">${(invoice.amount_paid || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">{language === 'es' ? 'Vence' : 'Due Date'}</p>
                          <p className="font-bold text-slate-900">
                            {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd') : '-'}
                          </p>
                        </div>
                        {!isPaid && (
                          <div>
                            <p className="text-slate-500 text-xs">{language === 'es' ? 'Adeudado' : 'Balance'}</p>
                            <p className="font-bold text-amber-600">${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="border-slate-300 hover:bg-slate-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Ver' : 'View'}
                      </Button>
                      
                      {invoice.approval_status === 'pending_approval' && !isApproved && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(invoice.id)}
                          disabled={approveMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {approveMutation.isPending ? '...' : (language === 'es' ? 'Aprobar' : 'Approve')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200">
              <CardTitle>{selectedInvoice.invoice_number}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{language === 'es' ? 'Fecha' : 'Invoice Date'}</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(selectedInvoice.invoice_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{language === 'es' ? 'Vence' : 'Due Date'}</p>
                  <p className="font-semibold text-slate-900">
                    {selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'MMMM dd, yyyy') : '-'}
                  </p>
                </div>
              </div>

              {/* Customer & Job Info */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{language === 'es' ? 'Información' : 'Details'}</p>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-600">{language === 'es' ? 'Cliente:' : 'Customer:'}</span> <span className="font-semibold">{selectedInvoice.customer_name}</span></p>
                  <p><span className="text-slate-600">{language === 'es' ? 'Trabajo:' : 'Job:'}</span> <span className="font-semibold">{selectedInvoice.job_name}</span></p>
                </div>
              </div>

              {/* Amounts */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === 'es' ? 'Subtotal' : 'Subtotal'}</span>
                  <span className="font-semibold">${(selectedInvoice.subtotal || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
                {selectedInvoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{language === 'es' ? 'Impuesto' : 'Tax'}</span>
                    <span className="font-semibold">${(selectedInvoice.tax_amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="font-bold text-slate-900">{language === 'es' ? 'Total' : 'Total'}</span>
                  <span className="font-bold text-lg text-slate-900">${(selectedInvoice.total || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Payment Status */}
              {selectedInvoice.amount_paid > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-semibold mb-2">{language === 'es' ? 'Pagado' : 'Payment Received'}</p>
                  <p className="text-2xl font-bold text-green-700">${(selectedInvoice.amount_paid || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                </div>
              )}

              {/* Approval Section */}
              {selectedInvoice.approval_status === 'pending_approval' && !selectedInvoice.customer_approved && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-700 font-semibold mb-3">
                    {language === 'es' ? 'Esta factura necesita tu aprobación' : 'This invoice requires your approval'}
                  </p>
                  <Button
                    onClick={() => {
                      approveMutation.mutate(selectedInvoice.id);
                    }}
                    disabled={approveMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? '...' : (language === 'es' ? 'Aprobar Factura' : 'Approve Invoice')}
                  </Button>
                </div>
              )}

              {selectedInvoice.customer_approved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <p className="text-sm text-green-700 font-semibold">
                    {language === 'es' ? 'Factura aprobada' : 'Invoice Approved'}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <Button
                variant="outline"
                onClick={() => setSelectedInvoice(null)}
                className="w-full border-slate-300"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}