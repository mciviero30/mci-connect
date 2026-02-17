import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function TMInvoiceBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState(null);

  // Fetch T&M eligible jobs
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['tm-jobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.list('-created_date');
      
      // Filter jobs with T&M authorization
      const tmJobs = [];
      for (const job of allJobs) {
        if (job.authorization_id) {
          const auths = await base44.entities.WorkAuthorization.filter({ id: job.authorization_id });
          if (auths[0]?.authorization_type === 'tm') {
            tmJobs.push(job);
          }
        }
      }
      return tmJobs;
    },
  });

  // Fetch customers for manual mode
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
    enabled: manualMode,
  });

  // Preview unbilled items
  const previewMutation = useMutation({
    mutationFn: async ({ job_id, start_date, end_date }) => {
      if (job_id) {
        // Existing job mode
        const allTimeEntries = await base44.entities.TimeEntry.filter({ job_id });
        const unbilledTime = allTimeEntries.filter(e => 
          !e.billed_at && 
          e.billable !== false &&
          e.date >= start_date && 
          e.date <= end_date &&
          e.status === 'approved'
        );

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
      } else {
        // Manual mode - empty preview (manual entry)
        return {
          time_entries: [],
          expenses: [],
          labor_total: 0,
          expenses_total: 0,
          total: 0,
          manual: true
        };
      }
    },
    onSuccess: (data) => {
      setPreview(data);
    },
  });

  // Create T&M invoice
  const createMutation = useMutation({
    mutationFn: async () => {
      if (manualMode) {
        // Manual invoice creation (no pre-existing job)
        const customer = customers.find(c => c.id === customerId);
        const result = await base44.functions.invoke('createTMInvoice', {
          manual_mode: true,
          customer_id: customerId,
          customer_name: customer?.name || '',
          job_name: jobName,
          job_address: jobAddress,
          start_date: startDate,
          end_date: endDate
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
      // I4 — Post-Invoice Lock Confirmation
      const lockedCount = (preview?.time_entries?.length || 0) + (preview?.expenses?.length || 0);
      toast({ 
        title: '✅ T&M Invoice Created', 
        description: `${lockedCount} records are now locked and cannot be modified.`,
        variant: 'success',
        duration: 8000
      });
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['time-entries']);
      queryClient.invalidateQueries(['expenses']);
      setPreview(null);
      setSelectedJobId('');
      setStartDate('');
      setEndDate('');
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create invoice', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handlePreview = () => {
    if (manualMode) {
      if (!customerId || !jobName || !startDate || !endDate) {
        toast({ title: 'Please fill all required fields', variant: 'destructive' });
        return;
      }
    } else {
      if (!selectedJobId || !startDate || !endDate) {
        toast({ title: 'Please select job and date range', variant: 'destructive' });
        return;
      }
    }
    previewMutation.mutate({ job_id: selectedJobId, start_date: startDate, end_date: endDate });
  };

  const handleCreate = () => {
    if (manualMode) {
      // Manual mode - allow empty invoice (user adds line items later)
      createMutation.mutate();
    } else {
      if (!preview || preview.time_entries.length === 0 && preview.expenses.length === 0) {
        toast({ title: 'No unbilled items to invoice', variant: 'destructive' });
        return;
      }
      createMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Time & Materials Invoice Builder
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create invoices from unbilled time entries and expenses
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Invoice Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={!manualMode ? 'default' : 'outline'}
                onClick={() => setManualMode(false)}
                className="flex-1"
              >
                Existing Job
              </Button>
              <Button 
                variant={manualMode ? 'default' : 'outline'}
                onClick={() => setManualMode(true)}
                className="flex-1"
              >
                Manual Entry
              </Button>
            </div>

            {!manualMode ? (
              <div>
                <Label>T&M Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select T&M job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.name} - {job.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label>Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Job Name *</Label>
                  <Input 
                    value={jobName} 
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Enter job name"
                  />
                </div>
                <div>
                  <Label>Job Address</Label>
                  <Input 
                    value={jobAddress} 
                    onChange={(e) => setJobAddress(e.target.value)}
                    placeholder="Enter job address (optional)"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            <Button onClick={handlePreview} disabled={previewMutation.isPending}>
              {previewMutation.isPending ? 'Loading...' : manualMode ? 'Create Draft Invoice' : 'Preview Unbilled Items'}
            </Button>
          </CardContent>
        </Card>

        {preview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Invoice Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Time Entries</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {preview.time_entries.length}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Expenses</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {preview.expenses.length}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${preview.total.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Labor: ${preview.labor_total.toFixed(2)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Expenses: ${preview.expenses_total.toFixed(2)}</p>
              </div>

              {preview.manual ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 rounded-lg mb-4">
                  <p className="text-sm text-blue-900 dark:text-blue-300 mb-2">
                    Manual T&M invoice will be created as a <strong>draft</strong>. You can add line items manually in the invoice editor.
                  </p>
                </div>
              ) : preview.time_entries.length === 0 && preview.expenses.length === 0 ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>No unbilled items in this date range</span>
                </div>
              ) : (
                <>
                  {/* I3 — Pre-Invoice Lock Warning */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                          ⚠️ Important: Invoice Locks Records
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          Creating this invoice will <strong>permanently lock</strong> {preview.time_entries.length} time entries 
                          and {preview.expenses.length} expenses. They cannot be edited or deleted after billing.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
                    {createMutation.isPending ? 'Creating...' : preview.manual ? 'Create Draft Invoice' : 'Create Invoice (Lock Records)'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!loadingJobs && jobs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              {/* I2 — Educational Empty State */}
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No Time & Materials Jobs
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
                T&M Invoice Builder works only with jobs that have 
                <strong> Time & Materials authorization</strong>.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 p-4 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold mb-2">
                  To bill hourly work:
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-400 text-left space-y-1">
                  <li>1. Create WorkAuthorization (type: <strong>T&M</strong>)</li>
                  <li>2. Create Job from that authorization</li>
                  <li>3. Employees log hours on that job</li>
                  <li>4. Return here to bill approved hours</li>
                </ol>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                Fixed Price jobs cannot use this builder.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}