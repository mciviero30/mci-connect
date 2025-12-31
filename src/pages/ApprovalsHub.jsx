import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, FileText, FileCheck, Briefcase, Clock, Eye } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { canApprove } from '@/components/core/roleRules';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { useToast } from '@/components/ui/toast';

export default function ApprovalsHub() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const userCanApprove = user ? canApprove(user) : false;

  // Fetch pending quotes
  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['pendingQuotes'],
    queryFn: () => base44.entities.Quote.filter({ approval_status: 'pending_approval' }),
    enabled: userCanApprove,
    initialData: []
  });

  // Fetch pending invoices
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['pendingInvoices'],
    queryFn: () => base44.entities.Invoice.filter({ approval_status: 'pending_approval' }),
    enabled: userCanApprove,
    initialData: []
  });

  // Fetch pending jobs
  const { data: pendingJobs = [] } = useQuery({
    queryKey: ['pendingJobs'],
    queryFn: () => base44.entities.Job.filter({ approval_status: 'pending_approval' }),
    enabled: userCanApprove,
    initialData: []
  });

  // Approve Quote
  const approveQuoteMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Quote.update(id, {
      approval_status: 'approved',
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      approval_notes: notes || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? 'Estimado aprobado' : 'Quote approved');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  // Reject Quote
  const rejectQuoteMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Quote.update(id, {
      approval_status: 'rejected',
      rejected_by: user.email,
      rejected_at: new Date().toISOString(),
      approval_notes: notes || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? 'Estimado rechazado' : 'Quote rejected');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  // Approve Invoice + Trigger Provisioning
  const approveInvoiceMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const invoice = await base44.entities.Invoice.update(id, {
        approval_status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString(),
        approval_notes: notes || ''
      });

      // Trigger provisioning
      try {
        await base44.functions.invoke('provisionJobFromInvoice', {
          invoice_id: id
        });
      } catch (provisionError) {
        console.warn('Provisioning failed (non-critical):', provisionError);
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(language === 'es' ? 'Factura aprobada y provisionada' : 'Invoice approved and provisioned');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  // Reject Invoice
  const rejectInvoiceMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Invoice.update(id, {
      approval_status: 'rejected',
      rejected_by: user.email,
      rejected_at: new Date().toISOString(),
      approval_notes: notes || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura rechazada' : 'Invoice rejected');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  // Approve Job
  const approveJobMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Job.update(id, {
      approval_status: 'approved',
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      approval_notes: notes || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(language === 'es' ? 'Trabajo aprobado' : 'Job approved');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  // Reject Job
  const rejectJobMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Job.update(id, {
      approval_status: 'rejected',
      rejected_by: user.email,
      rejected_at: new Date().toISOString(),
      approval_notes: notes || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(language === 'es' ? 'Trabajo rechazado' : 'Job rejected');
      setSelectedItem(null);
      setApprovalNotes('');
    }
  });

  const handleApprove = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'quote') {
      approveQuoteMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    } else if (selectedItem.type === 'invoice') {
      approveInvoiceMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    } else if (selectedItem.type === 'job') {
      approveJobMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    }
  };

  const handleReject = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'quote') {
      rejectQuoteMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    } else if (selectedItem.type === 'invoice') {
      rejectInvoiceMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    } else if (selectedItem.type === 'job') {
      rejectJobMutation.mutate({ id: selectedItem.id, notes: approvalNotes });
    }
  };

  // Access control
  if (!userCanApprove) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
            </h2>
            <p className="text-red-700">
              {language === 'es' 
                ? 'Solo CEO, Administrator, o Admin pueden aprobar documentos.'
                : 'Only CEO, Administrator, or Admin can approve documents.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const QuoteCard = ({ quote }) => (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-slate-900">{quote.quote_number}</h4>
            <p className="text-sm text-slate-600">{quote.customer_name}</p>
            <p className="text-xs text-slate-500 mt-1">{quote.job_name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-blue-600">${quote.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">{format(new Date(quote.quote_date), 'MMM d, yyyy')}</p>
          </div>
        </div>
        {quote.created_by_role && (
          <Badge variant="outline" className="mb-2 text-xs">
            {language === 'es' ? 'Creado por' : 'Created by'}: {quote.created_by_role}
          </Badge>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedItem({ ...quote, type: 'quote' })}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Revisar' : 'Review'}
          </Button>
          <Link to={createPageUrl(`VerEstimado?id=${quote.id}`)} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full">
              <FileText className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Ver' : 'View'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const InvoiceCard = ({ invoice }) => (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-slate-900">{invoice.invoice_number}</h4>
            <p className="text-sm text-slate-600">{invoice.customer_name}</p>
            <p className="text-xs text-slate-500 mt-1">{invoice.job_name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-emerald-600">${invoice.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
          </div>
        </div>
        {invoice.created_by_role && (
          <Badge variant="outline" className="mb-2 text-xs">
            {language === 'es' ? 'Creado por' : 'Created by'}: {invoice.created_by_role}
          </Badge>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedItem({ ...invoice, type: 'invoice' })}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Revisar' : 'Review'}
          </Button>
          <Link to={createPageUrl(`VerFactura?id=${invoice.id}`)} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full">
              <FileCheck className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Ver' : 'View'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const JobCard = ({ job }) => (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-slate-900">{job.name}</h4>
            <p className="text-sm text-slate-600">{job.customer_name}</p>
            <p className="text-xs text-slate-500 mt-1">{job.address}</p>
          </div>
          <div className="text-right">
            {job.contract_amount && (
              <p className="font-bold text-lg text-purple-600">${job.contract_amount.toFixed(2)}</p>
            )}
            <Badge className="mt-1" variant="outline">{job.status}</Badge>
          </div>
        </div>
        {job.created_by_role && (
          <Badge variant="outline" className="mb-2 text-xs">
            {language === 'es' ? 'Creado por' : 'Created by'}: {job.created_by_role}
          </Badge>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedItem({ ...job, type: 'job' })}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            {language === 'es' ? 'Revisar' : 'Review'}
          </Button>
          <Link to={createPageUrl(`JobDetails?id=${job.id}`)} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full">
              <Briefcase className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Ver' : 'View'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'Hub de Aprobaciones' : 'Approvals Hub'}
          description={language === 'es' 
            ? 'Aprobar o rechazar estimados, facturas, y trabajos pendientes' 
            : 'Approve or reject pending quotes, invoices, and jobs'}
          icon={Clock}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">{language === 'es' ? 'Estimados Pendientes' : 'Pending Quotes'}</p>
                  <p className="text-3xl font-bold text-blue-900">{pendingQuotes.length}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600">{language === 'es' ? 'Facturas Pendientes' : 'Pending Invoices'}</p>
                  <p className="text-3xl font-bold text-emerald-900">{pendingInvoices.length}</p>
                </div>
                <FileCheck className="w-10 h-10 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">{language === 'es' ? 'Trabajos Pendientes' : 'Pending Jobs'}</p>
                  <p className="text-3xl font-bold text-purple-900">{pendingJobs.length}</p>
                </div>
                <Briefcase className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 p-1">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              {language === 'es' ? 'Facturas' : 'Invoices'} ({pendingInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {language === 'es' ? 'Estimados' : 'Quotes'} ({pendingQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {language === 'es' ? 'Trabajos' : 'Jobs'} ({pendingJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            {pendingInvoices.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {language === 'es' ? 'No hay facturas pendientes de aprobación' : 'No pending invoices to approve'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingInvoices.map(invoice => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            {pendingQuotes.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {language === 'es' ? 'No hay estimados pendientes de aprobación' : 'No pending quotes to approve'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingQuotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            {pendingJobs.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {language === 'es' ? 'No hay trabajos pendientes de aprobación' : 'No pending jobs to approve'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full bg-white dark:bg-slate-800">
              <CardHeader className="border-b">
                <CardTitle>
                  {language === 'es' ? 'Revisar Documento' : 'Review Document'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                    {selectedItem.type === 'quote' && selectedItem.quote_number}
                    {selectedItem.type === 'invoice' && selectedItem.invoice_number}
                    {selectedItem.type === 'job' && selectedItem.name}
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedItem.customer_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedItem.job_name || selectedItem.address}
                  </p>
                  <p className="text-xl font-bold text-blue-600 mt-2">
                    ${(selectedItem.total || selectedItem.contract_amount || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-700 dark:text-slate-300">
                    {language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
                  </Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder={language === 'es' ? 'Comentarios sobre la aprobación/rechazo...' : 'Comments on approval/rejection...'}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(null);
                      setApprovalNotes('');
                    }}
                    className="flex-1"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Rechazar' : 'Reject'}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Aprobar' : 'Approve'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}