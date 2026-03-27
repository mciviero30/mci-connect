import React, { useState, useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, Link2, XCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

export default function JobQuoteCleanup() {
  const queryClient = useQueryClient();
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // Redirect if not admin or CEO
  React.useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'ceo') {
      window.location.href = '/';
    }
  }, [user]);

  // Fetch orphaned quotes
  const { data: orphanedQuotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['orphaned-quotes'],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({ job_id: null }, '-created_date', 100);
      return quotes;
    },
    staleTime: 30000
  });

  // Fetch all jobs for matching
  const { data: allJobs = [] } = useQuery({
    queryKey: ['all-jobs-for-matching'],
    queryFn: () => base44.entities.Job.list('-created_date', 100),
    staleTime: Infinity
  });

  // Get suggested jobs for a quote
  const getSuggestedJobs = (quote) => {
    return allJobs.filter(job => 
      (job.customer_id === quote.customer_id) ||
      (job.job_name && quote.job_name && 
       job.job_name.toLowerCase().includes(quote.job_name.toLowerCase()))
    ).slice(0, 5);
  };

  // Assign quote to job
  const assignQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, jobId }) => {
      await base44.entities.Quote.update(quoteId, {
        job_id: jobId,
        job_link_backfilled: false,
        job_link_method: 'manual_cleanup'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-quotes'] });
      setSelectedQuoteId(null);
      setSelectedJobId(null);
    }
  });

  // Mark as intentionally orphaned
  const markIntentionalMutation = useMutation({
    mutationFn: async (quoteId) => {
      await base44.entities.Quote.update(quoteId, {
        job_link_backfilled: false,
        job_link_method: 'intentionally_orphaned'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-quotes'] });
      setSelectedQuoteId(null);
    }
  });

  const resolvedCount = useMemo(() => {
    return orphanedQuotes.filter(q => q.job_link_method === 'manual_cleanup' || q.job_link_method === 'intentionally_orphaned').length;
  }, [orphanedQuotes]);

  const remainingCount = orphanedQuotes.length - resolvedCount;
  const allResolved = remainingCount === 0;

  const selectedQuote = orphanedQuotes.find(q => q.id === selectedQuoteId);
  const suggestedJobs = selectedQuote ? getSuggestedJobs(selectedQuote) : [];

  if (quotesLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Job Quote Manual Cleanup"
        description="Review and assign orphaned Quotes before Job SSOT enforcement"
        icon={Link2}
      />

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{orphanedQuotes.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Orphaned</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{resolvedCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Resolved</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${remainingCount === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {remainingCount}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Remaining</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {allResolved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">All Quotes Resolved ✅</p>
            <p className="text-sm text-green-800 dark:text-green-200">System is ready for Job SSOT enforcement.</p>
          </div>
        </motion.div>
      )}

      {!allResolved && remainingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">{remainingCount} Quote(s) Unresolved</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">Please assign or mark as intentionally orphaned.</p>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Quote List */}
        <div className="col-span-2">
          <div className="space-y-3">
            <AnimatePresence>
              {orphanedQuotes.map((quote) => {
                const isSelected = selectedQuoteId === quote.id;
                const isResolved = quote.job_link_method === 'manual_cleanup' || quote.job_link_method === 'intentionally_orphaned';

                return (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <button
                      onClick={() => setSelectedQuoteId(isSelected ? null : quote.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isResolved
                          ? 'border-green-200 dark:border-green-800 bg-white dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {quote.quote_number}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {quote.job_name}
                          </p>
                        </div>
                        {isResolved && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {quote.job_link_method === 'manual_cleanup' ? 'Linked' : 'Intentional'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {quote.customer_name} • ${quote.total?.toLocaleString()} • {formatDate(quote.created_date)}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedQuote ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-6 p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg"
            >
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                {selectedQuote.quote_number}
              </h3>

              <div className="space-y-3 mb-6 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Job Name</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedQuote.job_name}</p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Customer</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Total</p>
                  <p className="font-medium text-slate-900 dark:text-white">${selectedQuote.total?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Status</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedQuote.status}</p>
                </div>
              </div>

              {/* Suggested Jobs */}
              {suggestedJobs.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Suggested Jobs
                  </p>
                  <div className="space-y-2">
                    {suggestedJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left p-2 rounded border transition-all text-xs ${
                          selectedJobId === job.id
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                        }`}
                      >
                        <p className="font-medium text-slate-900 dark:text-white">{job.job_number}</p>
                        <p className="text-slate-600 dark:text-slate-400">{job.job_name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <Button
                  onClick={() => {
                    if (selectedJobId) {
                      assignQuoteMutation.mutate({
                        quoteId: selectedQuote.id,
                        jobId: selectedJobId
                      });
                    }
                  }}
                  disabled={!selectedJobId || assignQuoteMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {assignQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Assign to Selected Job
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => markIntentionalMutation.mutate(selectedQuote.id)}
                  disabled={markIntentionalMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {markIntentionalMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark as Intentional
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setSelectedQuoteId(null)}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="sticky top-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Select a Quote to view details and assign a Job
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Completion State */}
      {allResolved && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
            Manual Cleanup Complete
          </h3>
          <p className="text-green-800 dark:text-green-200 text-sm mb-4">
            All Quotes have been reviewed and assigned. System is ready for Job SSOT enforcement.
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Run auditJobSSotReadiness() to verify system readiness.
          </p>
        </motion.div>
      )}
    </div>
  );
}