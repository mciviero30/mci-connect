import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Plus, 
  Pause, 
  Play, 
  Trash2,
  Calendar,
  DollarSign,
  Mail,
  FileText,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RecurringInvoiceDialog from '../components/invoices/RecurringInvoiceDialog';

export default function RecurringInvoices() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['recurringInvoices'],
    queryFn: () => base44.entities.RecurringInvoice.list('-created_date'),
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, newStatus }) => 
      base44.entities.RecurringInvoice.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
    }
  });

  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30' },
    paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30' }
  };

  const frequencyLabels = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  };

  const activeTemplates = templates.filter(t => t.status === 'active');
  const totalMonthlyRevenue = activeTemplates
    .filter(t => t.frequency === 'monthly')
    .reduce((sum, t) => sum + (t.total || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-20 md:pb-0">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-600" />
                Recurring Invoices
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Automate recurring billing for your customers
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setDialogOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active Templates</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeTemplates.length}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${totalMonthlyRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Generated</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {templates.reduce((sum, t) => sum + (t.invoices_generated || 0), 0)}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Paused</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {templates.filter(t => t.status === 'paused').length}
                    </p>
                  </div>
                  <Pause className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <RefreshCw className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Recurring Invoices Yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Create templates to automate your recurring billing
                </p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map(template => {
              const config = statusConfig[template.status] || statusConfig.active;
              const nextDate = template.next_invoice_date ? new Date(template.next_invoice_date) : null;
              const isPaused = template.status === 'paused';
              
              return (
                <Card key={template.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{template.template_name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Badge className={config.color}>{config.label}</Badge>
                          <Badge variant="outline">{frequencyLabels[template.frequency]}</Badge>
                          {template.auto_send && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                              <Mail className="w-3 h-3 mr-1" />
                              Auto-Send
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">${template.total.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{frequencyLabels[template.frequency]}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Customer</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{template.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Job</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{template.job_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Next Invoice</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {nextDate ? format(nextDate, 'MMM dd, yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Invoices Generated</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {template.invoices_generated || 0} invoices
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 mb-4">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Items:</p>
                      <div className="space-y-1">
                        {template.items?.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">{item.item_name}</span>
                            <span className="text-slate-900 dark:text-white font-medium">${item.total.toFixed(2)}</span>
                          </div>
                        ))}
                        {template.items?.length > 3 && (
                          <p className="text-xs text-slate-500 italic">+{template.items.length - 3} more items</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setEditingTemplate(template);
                          setDialogOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      >
                        Edit
                      </Button>
                      
                      <Button
                        onClick={() => pauseMutation.mutate({ 
                          id: template.id, 
                          newStatus: isPaused ? 'active' : 'paused' 
                        })}
                        size="sm"
                        variant="outline"
                        disabled={pauseMutation.isPending}
                        className="border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                      >
                        {isPaused ? (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        )}
                      </Button>

                      {template.last_invoice_id && (
                        <Link to={createPageUrl(`VerFactura?id=${template.last_invoice_id}`)}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 dark:border-slate-700"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Last Invoice
                          </Button>
                        </Link>
                      )}

                      <Button
                        onClick={() => {
                          if (confirm('Delete this recurring invoice template?')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <RecurringInvoiceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={editingTemplate}
          onSuccess={() => {
            setDialogOpen(false);
            setEditingTemplate(null);
          }}
        />
      </div>
    </div>
  );
}