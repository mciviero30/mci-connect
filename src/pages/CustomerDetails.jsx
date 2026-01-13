import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Edit, Mail, Phone, MapPin, Building2, Globe,
  FileText, Receipt, Calendar, DollarSign, TrendingUp, User,
  FileCheck, MessageSquare, MoreVertical, Smartphone
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "../components/clientes/CustomerForm";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { getCustomerDisplayName } from "@/components/utils/nameHelpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CustomerDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => base44.entities.Customer.get(id),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['customer-quotes', customer?.email],
    queryFn: () => base44.entities.Quote.filter({ customer_email: customer.email }),
    enabled: !!customer?.email,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', customer?.email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: customer.email }),
    enabled: !!customer?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowEditForm(false);
      toast.success(t('customerUpdated'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-slate-600">Customer not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getCustomerDisplayName(customer);
  
  const totalQuotes = quotes.length;
  const totalInvoices = invoices.length;
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingAmount = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.balance || inv.total || 0), 0);

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Clientes'))}
            className="text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <Button
            onClick={() => setShowEditForm(true)}
            className="bg-blue-600 text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t('edit')}
          </Button>
        </div>

        {/* Customer Info Card */}
        <Card className="mb-6 bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {customer.first_name?.[0]}{customer.last_name?.[0]}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    {displayName}
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400">{customer.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-lg font-semibold text-blue-600">{customer.company}</span>
                  <Badge className={customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {customer.status}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.mobile && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Smartphone className="w-4 h-4 text-slate-500" />
                      <a href={`tel:${customer.mobile}`} className="hover:text-blue-600">
                        {customer.mobile}
                      </a>
                    </div>
                  )}
                  {customer.company_website && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <a href={customer.company_website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                        {customer.company_website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:w-48">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalQuotes}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{t('quotes')}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totalInvoices}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{t('invoices')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Avg Quote Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${totalQuotes > 0 ? Math.round(quotes.reduce((sum, q) => sum + (q.total || 0), 0) / totalQuotes).toLocaleString() : 0}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotes">Quotes ({totalQuotes})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({totalInvoices})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity */}
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...quotes.slice(0, 3), ...invoices.slice(0, 3)]
                    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                          {item.quote_number ? (
                            <FileText className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Receipt className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.quote_number || item.invoice_number}
                            </p>
                            <p className="text-sm text-slate-500">{item.job_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            ${(item.total || 0).toLocaleString()}
                          </p>
                          <Badge className={statusColors[item.status]}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>All Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <Link
                      key={quote.id}
                      to={createPageUrl('VerEstimado') + `?id=${quote.id}`}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{quote.quote_number}</p>
                          <p className="text-sm text-slate-500">{quote.job_name}</p>
                          <p className="text-xs text-slate-400">
                            {quote.quote_date && format(new Date(quote.quote_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          ${(quote.total || 0).toLocaleString()}
                        </p>
                        <Badge className={statusColors[quote.status]}>
                          {quote.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {quotes.length === 0 && (
                    <p className="text-center py-8 text-slate-500">No quotes found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      to={createPageUrl('VerFactura') + `?id=${invoice.id}`}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{invoice.invoice_number}</p>
                          <p className="text-sm text-slate-500">{invoice.job_name}</p>
                          <p className="text-xs text-slate-400">
                            {invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          ${(invoice.total || 0).toLocaleString()}
                        </p>
                        {invoice.balance > 0 && (
                          <p className="text-sm text-yellow-600">
                            Balance: ${invoice.balance.toLocaleString()}
                          </p>
                        )}
                        <Badge className={statusColors[invoice.status]}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {invoices.length === 0 && (
                    <p className="text-center py-8 text-slate-500">No invoices found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Company Information */}
              <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.company_website && (
                    <div>
                      <p className="text-sm text-slate-500">Website</p>
                      <a href={customer.company_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {customer.company_website}
                      </a>
                    </div>
                  )}
                  {customer.company_tax_id && (
                    <div>
                      <p className="text-sm text-slate-500">Tax ID / EIN</p>
                      <p className="text-slate-900 dark:text-white">{customer.company_tax_id}</p>
                    </div>
                  )}
                  {customer.industry && (
                    <div>
                      <p className="text-sm text-slate-500">Industry</p>
                      <p className="text-slate-900 dark:text-white">{customer.industry}</p>
                    </div>
                  )}
                  {customer.customer_type && (
                    <div>
                      <p className="text-sm text-slate-500">Customer Type</p>
                      <Badge>{customer.customer_type}</Badge>
                    </div>
                  )}
                  {customer.payment_terms && (
                    <div>
                      <p className="text-sm text-slate-500">Payment Terms</p>
                      <p className="text-slate-900 dark:text-white">{customer.payment_terms.replace('_', ' ')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(customer.billing_address || customer.address) && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Billing Address</p>
                      <p className="text-slate-900 dark:text-white">
                        {customer.billing_address || customer.address}
                        {(customer.billing_city || customer.city) && `, ${customer.billing_city || customer.city}`}
                        {(customer.billing_state || customer.state) && `, ${customer.billing_state || customer.state}`}
                        {(customer.billing_zip || customer.zip) && ` ${customer.billing_zip || customer.zip}`}
                      </p>
                    </div>
                  )}
                  {customer.shipping_address && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Shipping Address</p>
                      <p className="text-slate-900 dark:text-white">
                        {customer.shipping_address}
                        {customer.shipping_city && `, ${customer.shipping_city}`}
                        {customer.shipping_state && `, ${customer.shipping_state}`}
                        {customer.shipping_zip && ` ${customer.shipping_zip}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {customer.notes && (
                <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">
                {t('editCustomer')}
              </DialogTitle>
            </DialogHeader>
            <CustomerForm
              customer={customer}
              onSubmit={(data) => updateMutation.mutate(data)}
              onClose={() => setShowEditForm(false)}
              isProcessing={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}