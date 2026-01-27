import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Link as LinkIcon, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';

export default function JobQuoteCleanup() {
  const [selectedJobs, setSelectedJobs] = useState({});
  const queryClient = useQueryClient();

  // Fetch user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch orphaned Quotes
  const { data: allQuotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['all-quotes-cleanup'],
    queryFn: () => base44.entities.Quote.filter({}),
  });

  const orphanedQuotes = allQuotes.filter(q => !q.job_id && !q.deleted_at);

  // Fetch all Jobs
  const { data: allJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['all-jobs-cleanup'],
    queryFn: () => base44.entities.Job.filter({}),
  });

  const activeJobs = allJobs.filter(j => !j.deleted_at);

  // Mutation to assign job
  const assignJobMutation = useMutation({
    mutationFn: async ({ quoteId, jobId }) => {
      return await base44.entities.Quote.update(quoteId, {
        job_id: jobId,
        job_link_backfilled: true,
        job_link_method: 'manual_cleanup',
        backfill_confidence: 100
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quotes-cleanup'] });
    },
  });

  // Find matching Jobs for a Quote
  const findMatchingJobs = (quote) => {
    if (!quote.job_name || !quote.customer_id) return [];
    
    const normalizedName = quote.job_name.trim().toLowerCase();
    const customerId = quote.customer_id;
    
    return activeJobs.filter(job => {
      const jobNormalized = (job.name || '').trim().toLowerCase();
      const jobCustomerId = job.customer_id || '';
      
      return jobNormalized === normalizedName && jobCustomerId === customerId;
    });
  };

  // Handle job assignment
  const handleAssign = async (quoteId) => {
    const jobId = selectedJobs[quoteId];
    if (!jobId) return;

    try {
      await assignJobMutation.mutateAsync({ quoteId, jobId });
      setSelectedJobs(prev => {
        const updated = { ...prev };
        delete updated[quoteId];
        return updated;
      });
    } catch (error) {
      console.error('Error assigning job:', error);
    }
  };

  if (loadingQuotes || loadingJobs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completionRate = allQuotes.length > 0 
    ? ((allQuotes.length - orphanedQuotes.length) / allQuotes.length * 100).toFixed(1)
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <PageHeader
        title="🔧 Job Quote Cleanup (Pre-SSOT)"
        description="Manual resolution of orphaned Quotes before SSOT enforcement"
        showBack={true}
        stats={[
          { label: 'Total Quotes', value: allQuotes.length, icon: Info },
          { label: 'Orphaned', value: orphanedQuotes.length, icon: AlertTriangle },
          { label: 'Completion', value: `${completionRate}%`, icon: CheckCircle2 }
        ]}
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Instructions Card */}
        <Card className="border-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Admin Instructions</h3>
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <li>• Review each orphaned Quote below</li>
                  <li>• Matching Jobs are shown (same name + customer)</li>
                  <li>• Manually select the correct Job for each Quote</li>
                  <li>• Click "Assign Job" to save</li>
                  <li>• NO auto-assignments - YOU decide</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Status */}
        {orphanedQuotes.length === 0 ? (
          <Card className="border-2 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    🎉 Cleanup Complete!
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    All Quotes are now linked to Jobs. System ready for SSOT enforcement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Orphaned Quotes ({orphanedQuotes.length})
            </h2>

            {orphanedQuotes.map((quote) => {
              const matchingJobs = findMatchingJobs(quote);
              const selectedJobId = selectedJobs[quote.id];
              const selectedJob = activeJobs.find(j => j.id === selectedJobId);

              return (
                <Card key={quote.id} className="border-2 border-orange-200 dark:border-orange-900">
                  <CardHeader className="bg-orange-50 dark:bg-orange-950/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {quote.quote_number || quote.id}
                          </CardTitle>
                          <Badge className="bg-orange-500 text-white">
                            Orphaned
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <p><strong>Job Name:</strong> {quote.job_name || 'N/A'}</p>
                          <p><strong>Customer:</strong> {quote.customer_name || 'N/A'}</p>
                          <p><strong>Total:</strong> ${quote.total?.toFixed(2) || '0.00'}</p>
                          <p><strong>Date:</strong> {quote.created_date ? new Date(quote.created_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-4">
                    {/* Matching Jobs */}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                        Matching Jobs ({matchingJobs.length})
                      </h4>
                      
                      {matchingJobs.length === 0 ? (
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400">
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          No existing Job found with matching name + customer.
                          You may need to create a new Job or verify the customer.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {matchingJobs.map(job => (
                            <div key={job.id} className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="text-sm space-y-1">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {job.name}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    Status: {job.status} | Created: {job.created_date ? new Date(job.created_date).toLocaleDateString() : 'N/A'}
                                  </p>
                                  {job.backfill_source && (
                                    <Badge variant="outline" className="text-xs">
                                      Source: {job.backfill_source}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manual Assignment */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">
                        Manual Job Assignment
                      </h4>
                      
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Select
                            value={selectedJobId || ''}
                            onValueChange={(value) => setSelectedJobs(prev => ({
                              ...prev,
                              [quote.id]: value
                            }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a Job..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeJobs.map(job => (
                                <SelectItem key={job.id} value={job.id}>
                                  {job.name} - {job.customer_name || 'No customer'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button
                          onClick={() => handleAssign(quote.id)}
                          disabled={!selectedJobId || assignJobMutation.isPending}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          {assignJobMutation.isPending ? 'Assigning...' : 'Assign Job'}
                        </Button>
                      </div>

                      {selectedJob && (
                        <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <strong>Selected:</strong> {selectedJob.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            This Quote will be permanently linked to this Job.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Safety Notice */}
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
              ⚠️ Safety Rules
            </h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• NO auto-assignments</li>
              <li>• NO new Jobs created</li>
              <li>• NO Job merging</li>
              <li>• Each assignment is FINAL (requires manual change if wrong)</li>
              <li>• SSOT enforcement will be activated after cleanup is complete</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}