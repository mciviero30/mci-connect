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
          if (auths[0]?.authorization_type === 'time_materials') {
            tmJobs.push(job);
          }
        }
      }
      return tmJobs;
    },
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
      const result = await base44.functions.invoke('createTMInvoice', {
        job_id: selectedJobId,
        start_date: startDate,
        end_date: endDate
      });
      return result;
    },
    onSuccess: () => {
      toast({ title: 'T&M Invoice created successfully' });
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
    if (!selectedJobId || !startDate || !endDate) {
      toast({ title: 'Please select job and date range', variant: 'destructive' });
      return;
    }
    previewMutation.mutate({ job_id: selectedJobId, start_date: startDate, end_date: endDate });
  };

  const handleCreate = () => {
    if (!preview || preview.time_entries.length === 0 && preview.expenses.length === 0) {
      toast({ title: 'No unbilled items to invoice', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
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
              Select Job & Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {previewMutation.isPending ? 'Loading...' : 'Preview Unbilled Items'}
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

              {preview.time_entries.length === 0 && preview.expenses.length === 0 ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>No unbilled items in this date range</span>
                </div>
              ) : (
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loadingJobs && jobs.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <AlertCircle className="w-5 h-5" />
                <span>No Time & Materials jobs found. Only jobs with T&M authorization can be invoiced here.</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}