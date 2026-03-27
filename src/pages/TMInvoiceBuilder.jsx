import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Clock, DollarSign, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { getCustomerDisplayName, sortCustomersByName } from '@/components/utils/nameHelpers';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';
import LineItemsEditor from '@/components/documentos/LineItemsEditor';

export default function TMInvoiceBuilder() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [mode, setMode] = useState('existing'); // 'existing' or 'manual'
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [manualItems, setManualItems] = useState([
    { item_name: '', description: '', quantity: 1, unit: 'hours', unit_price: 60, total: 60 }
  ]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch T&M eligible jobs (both T&M and Fixed Price jobs can have T&M billing)
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['tm-jobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.list('-created_date');
      
      // Allow both billing types - Fixed Price jobs can have T&M additional work
      return allJobs.filter(job => 
        job.billing_type === 'time_materials' || 
        job.billing_type === 'fixed_price'
      );
    },
  });

  // Fetch customers for manual mode
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
    enabled: mode === 'manual',
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list('-created_date', 500),
    initialData: [],
  });

  // Preview unbilled items
  const previewMutation = useMutation({
    mutationFn: async ({ job_id, start_date, end_date }) => {
      // Fetch unbilled time entries
      const allTimeEntries = await base44.entities.TimeEntry.filter({ job_id });
      const unbilledTime = allTimeEntries.filter(e => 
        !e.billed_at && 
        e.billable !== false &&
        e.date >= start_date && 
        e.date <= end_date &&
        e.status === 'approved'
      );

      // Fetch unbilled expenses
      const allExpenses = await base44.entities.Expense.filter({ job_id });
      const unbilledExpenses = allExpenses.filter(e =>
        !e.billed_at &&
        e.billable === true &&
        e.date >= start_date &&
        e.date <= end_date &&
        e.status === 'approved'
      );

      const job = jobs.find(j => j.id === job_id);
      const rate = job?.regular_hourly_rate || 60;

      const laborTotal = unbilledTime.reduce((sum, e) => 
        sum + (e.hours_worked || 0) * (e.rate_snapshot || rate), 0
      );
      const expensesTotal = unbilledExpenses.reduce((sum, e) => {
        const markup = e.markup || 0;
        return sum + (e.amount || 0) * (1 + markup / 100);
      }, 0);

      return {
        time_entries: unbilledTime,
        expenses: unbilledExpenses,
        labor_total: laborTotal,
        expenses_total: expensesTotal,
        total: laborTotal + expensesTotal
      };
    },
    onSuccess: (data) => {
      setPreview(data);
    },
  });

  // Create T&M invoice
  const createMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'manual') {
        // Manual invoice creation
        const customer = customers.find(c => c.id === customerId);
        
        const subtotal = manualItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const tax_rate = 0;
        const tax_amount = 0;
        const total = subtotal;

        const result = await base44.functions.invoke('createTMInvoice', {
          manual_mode: true,
          customer_id: customerId,
          customer_name: customer?.name || '',
          customer_email: customer?.email || '',
          job_name: jobName,
          job_address: jobAddress,
          start_date: startDate,
          end_date: endDate,
          items: manualItems,
          subtotal,
          tax_rate,
          tax_amount,
          total
        });
        return result;
      } else {
        // Existing job mode
        const result = await base44.functions.invoke('createTMInvoice', {
          job_id: selectedJobId,
          start_date: startDate,
          end_date: endDate
        });
        return result;
      }
    },
    onSuccess: (result) => {
      const lockedCount = mode === 'existing' 
        ? (preview?.time_entries?.length || 0) + (preview?.expenses?.length || 0)
        : 0;
      
      toast.success(
        language === 'es' ? '✅ Factura T&M Creada' : '✅ T&M Invoice Created',
        {
          description: mode === 'existing' && lockedCount > 0
            ? `${lockedCount} records locked`
            : language === 'es' ? 'Edita los items en la factura' : 'Edit items in the invoice'
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // Navigate to invoice
      const invoiceId = result?.data?.invoice?.id || result?.invoice?.id;
      if (invoiceId) {
        navigate(createPageUrl(`VerFactura?id=${invoiceId}`));
      } else {
        navigate(createPageUrl('Facturas'));
      }
    },
    onError: (error) => {
      toast.error('Failed to create invoice', { description: error.message });
    },
  });

  const handlePreview = () => {
    if (mode === 'existing') {
      if (!selectedJobId || !startDate || !endDate) {
        toast.error(language === 'es' ? 'Completa todos los campos' : 'Please fill all fields');
        return;
      }
      previewMutation.mutate({ job_id: selectedJobId, start_date: startDate, end_date: endDate });
    } else {
      // Manual mode - validate
      if (!customerId || !jobName || !startDate || !endDate) {
        toast.error(language === 'es' ? 'Completa todos los campos requeridos' : 'Please fill all required fields');
        return;
      }
      setPreview({ manual: true, items: manualItems });
    }
  };

  const handleCreate = () => {
    if (mode === 'manual') {
      createMutation.mutate();
    } else {
      if (!preview || (preview.time_entries.length === 0 && preview.expenses.length === 0)) {
        toast.error(language === 'es' ? 'No hay items sin facturar' : 'No unbilled items');
        return;
      }
      createMutation.mutate();
    }
  };

  const handleCustomerSelect = (customer_id) => {
    const customer = customers.find(c => c.id === customer_id);
    if (customer) {
      setCustomerId(customer_id);
      setJobAddress(customer.address || '');
    }
  };

  // Calculate manual totals
  const manualSubtotal = manualItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Constructor de Facturas T&M' : 'Time & Materials Invoice Builder'}
          showBack={true}
        />

        {/* Fixed Total Bar */}
        {(preview || mode === 'manual') && (
          <div className="sticky top-0 z-10 mb-6 p-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl shadow-xl border-2 border-emerald-300">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-sm opacity-90">{language === 'es' ? 'Total Estimado' : 'Estimated Total'}</p>
                <p className="text-4xl font-bold">
                  ${mode === 'manual' ? manualSubtotal.toFixed(2) : (preview?.total || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-right text-white text-sm">
                {mode === 'existing' && preview && (
                  <>
                    <p className="opacity-90">{language === 'es' ? 'Labor' : 'Labor'}: ${preview.labor_total.toFixed(2)}</p>
                    <p className="opacity-90">{language === 'es' ? 'Gastos' : 'Expenses'}: ${preview.expenses_total.toFixed(2)}</p>
                  </>
                )}
                {mode === 'manual' && (
                  <p className="text-xs opacity-75 mt-1">{manualItems.length} {language === 'es' ? 'ítems' : 'items'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        <Card className="glass-card shadow-xl border-slate-200 mb-6">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">
              {language === 'es' ? 'Tipo de Factura' : 'Invoice Type'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={mode === 'existing' ? 'default' : 'outline'}
                onClick={() => setMode('existing')}
                className={mode === 'existing' ? 'bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white' : ''}
              >
                <Clock className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Trabajo Existente' : 'Existing Job'}
              </Button>
              <Button
                type="button"
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => setMode('manual')}
                className={mode === 'manual' ? 'bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white' : ''}
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Entrada Manual' : 'Manual Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Selection Card */}
        <Card className="glass-card shadow-xl border-slate-200 mb-6">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {mode === 'existing' 
                ? (language === 'es' ? 'Seleccionar Trabajo y Período' : 'Select Job & Period')
                : (language === 'es' ? 'Información del Trabajo' : 'Job Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {mode === 'existing' ? (
              <>
                <div>
                  <Label>{language === 'es' ? 'Trabajo T&M' : 'T&M Job'}</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo T&M' : 'Select T&M job'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id} className="text-slate-900">
                          {job.name} - {job.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>{t('selectCustomer')} *</Label>
                  <Select value={customerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={t('selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {sortCustomersByName(customers).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id} className="text-slate-900">
                          {getCustomerDisplayName(customer)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('jobName')} *</Label>
                  <Input 
                    value={jobName} 
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder={language === 'es' ? 'Nombre del trabajo' : 'Job name'}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label>{t('jobAddress')}</Label>
                  <AddressAutocomplete
                    value={jobAddress}
                    onChange={(value) => setJobAddress(value)}
                    onPlaceSelected={(placeData) => {
                      setJobAddress(placeData.full_address || placeData.address);
                    }}
                    placeholder={language === 'es' ? 'Dirección del trabajo' : 'Job address'}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'es' ? 'Fecha de Inicio' : 'Start Date'}</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Fecha de Fin' : 'End Date'}</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <Button 
              onClick={handlePreview} 
              disabled={previewMutation.isPending}
              className="w-full bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
            >
              {previewMutation.isPending 
                ? (language === 'es' ? 'Cargando...' : 'Loading...') 
                : mode === 'manual' 
                  ? (language === 'es' ? 'Continuar a Items' : 'Continue to Items')
                  : (language === 'es' ? 'Vista Previa' : 'Preview Unbilled Items')}
            </Button>
          </CardContent>
        </Card>

        {/* Preview/Items Card */}
        {preview && (
          <>
            {mode === 'manual' ? (
              <Card className="glass-card shadow-xl border-slate-200 mb-6">
                <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-slate-900">{t('invoiceItems')}</CardTitle>
                  <Button
                    type="button"
                    onClick={() => {
                      setManualItems([
                        ...manualItems,
                        { item_name: '', description: '', quantity: 1, unit: 'hours', unit_price: 60, total: 60 }
                      ]);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="text-xs">{t('addItem')}</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <LineItemsEditor 
                    items={manualItems}
                    onItemsChange={(newItems) => setManualItems(newItems)}
                    catalogItems={quoteItems}
                    allowCatalogSelect={true}
                    allowReorder={false}
                    onToast={(toastData) => toast[toastData.variant || 'success'](toastData.title, { description: toastData.description })}
                    derivedValues={null}
                    onAddItem={() => {
                      setManualItems([
                        ...manualItems,
                        { item_name: '', description: '', quantity: 1, unit: 'hours', unit_price: 60, total: 60 }
                      ]);
                    }}
                  />

                  <div className="mt-6 space-y-3 max-w-md ml-auto px-3 pb-4">
                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                      <span className="text-lg font-bold text-emerald-900">{t('total').toUpperCase()}:</span>
                      <span className="text-2xl font-bold text-emerald-700">${manualSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card shadow-xl border-slate-200 mb-6">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {language === 'es' ? 'Vista Previa de Factura' : 'Invoice Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="soft-blue-gradient p-4 rounded-lg">
                      <p className="text-sm opacity-90">{language === 'es' ? 'Horas' : 'Time Entries'}</p>
                      <p className="text-2xl font-bold">{preview.time_entries.length}</p>
                    </div>
                    <div className="soft-green-gradient p-4 rounded-lg">
                      <p className="text-sm opacity-90">{language === 'es' ? 'Gastos' : 'Expenses'}</p>
                      <p className="text-2xl font-bold">{preview.expenses.length}</p>
                    </div>
                    <div className="soft-purple-gradient p-4 rounded-lg">
                      <p className="text-sm opacity-90">Total</p>
                      <p className="text-2xl font-bold">${preview.total.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {language === 'es' ? 'Labor' : 'Labor'}: ${preview.labor_total.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {language === 'es' ? 'Gastos' : 'Expenses'}: ${preview.expenses_total.toFixed(2)}
                    </p>
                  </div>

                  {preview.time_entries.length === 0 && preview.expenses.length === 0 ? (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 p-4 bg-amber-50 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                      <span>{language === 'es' ? 'No hay items sin facturar en este período' : 'No unbilled items in this date range'}</span>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                            ⚠️ {language === 'es' ? 'Importante: La Factura Bloqueará Registros' : 'Important: Invoice Locks Records'}
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-400">
                            {language === 'es'
                              ? `Crear esta factura bloqueará permanentemente ${preview.time_entries.length} horas y ${preview.expenses.length} gastos. No se podrán editar después de facturar.`
                              : `Creating this invoice will permanently lock ${preview.time_entries.length} time entries and ${preview.expenses.length} expenses. They cannot be edited after billing.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {preview && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    if (mode === 'manual') {
                      setManualItems([{ item_name: '', description: '', quantity: 1, unit: 'hours', unit_price: 60, total: 60 }]);
                    }
                  }}
                  type="button"
                  className="bg-white border-slate-300 text-slate-700"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending || (mode === 'existing' && preview.time_entries.length === 0 && preview.expenses.length === 0)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg"
                  type="button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending 
                    ? (language === 'es' ? 'Creando...' : 'Creating...') 
                    : mode === 'manual'
                      ? (language === 'es' ? 'Crear Factura Borrador' : 'Create Draft Invoice')
                      : (language === 'es' ? 'Crear Factura (Bloquear)' : 'Create Invoice (Lock Records)')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loadingJobs && jobs.length === 0 && mode === 'existing' && (
          <Card className="glass-card shadow-xl border-slate-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'es' ? 'No hay Trabajos Disponibles' : 'No Jobs Available'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
                {language === 'es'
                  ? 'No tienes trabajos creados aún. Crea un trabajo primero para facturar horas adicionales.'
                  : 'No jobs created yet. Create a job first to bill additional hours.'}
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 p-4 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold mb-2">
                  {language === 'es' ? 'Para facturar trabajo por horas:' : 'To bill hourly work:'}
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-400 text-left space-y-1">
                  <li>{language === 'es' ? '1. Crear WorkAuthorization (tipo: T&M)' : '1. Create WorkAuthorization (type: T&M)'}</li>
                  <li>{language === 'es' ? '2. Crear Job desde esa autorización' : '2. Create Job from that authorization'}</li>
                  <li>{language === 'es' ? '3. Empleados registran horas en ese trabajo' : '3. Employees log hours on that job'}</li>
                  <li>{language === 'es' ? '4. Regresar aquí para facturar horas aprobadas' : '4. Return here to bill approved hours'}</li>
                </ol>
              </div>
              
              <Button
                onClick={() => setMode('manual')}
                className="mt-6 bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
              >
                {language === 'es' ? 'Usar Entrada Manual' : 'Use Manual Entry'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}