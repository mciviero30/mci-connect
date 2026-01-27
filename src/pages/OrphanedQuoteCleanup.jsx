import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getOrphanedQuotesForCleanup } from '@/functions/getOrphanedQuotesForCleanup';
import { assignJobToOrphanQuote } from '@/functions/assignJobToOrphanQuote';

export default function OrphanedQuoteCleanup() {
  const queryClient = useQueryClient();
  const [selectedJobMap, setSelectedJobMap] = useState({}); // quote_id -> job_id

  // Fetch orphaned quotes with context
  const { data: cleanupData, isLoading, error } = useQuery({
    queryKey: ['orphaned-quotes-cleanup'],
    queryFn: async () => {
      const response = await getOrphanedQuotesForCleanup({});
      return response.data;
    },
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Manual assignment mutation
  const assignMutation = useMutation({
    mutationFn: async ({ quote_id, job_id }) => {
      const response = await assignJobToOrphanQuote({
        quote_id,
        job_id
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Clear selection
      setSelectedJobMap(prev => {
        const updated = { ...prev };
        delete updated[variables.quote_id];
        return updated;
      });
      // Refetch list
      queryClient.invalidateQueries({ queryKey: ['orphaned-quotes-cleanup'] });
    },
  });

  const orphanedCount = cleanupData?.orphaned_count || 0;
  const orphanedQuotes = cleanupData?.orphaned_quotes || [];
  const resolvedCount = (cleanupData?.orphaned_count || 0) - orphanedQuotes.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Orphaned Quote Cleanup
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manual resolution of Quotes without Job assignments
          </p>
        </div>

        {/* Status Alert */}
        <Alert className={`mb-6 border-2 ${orphanedCount === 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'}`}>
          <div className="flex items-start gap-3">
            {orphanedCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <AlertDescription className={orphanedCount === 0 ? 'text-green-900 dark:text-green-200' : 'text-amber-900 dark:text-amber-200'}>
                <strong>{orphanedCount} orphaned Quotes remaining</strong> • 
                {resolvedCount > 0 && ` ${resolvedCount} already resolved`}
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Fetching orphaned quotes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-200">
              {error.message || 'Failed to load orphaned quotes'}
            </AlertDescription>
          </Alert>
        )}

        {/* Orphaned Quotes List */}
        {!isLoading && orphanedCount > 0 && (
          <div className="space-y-4">
            {orphanedQuotes.map((quote) => (
              <OrphanedQuoteCard
                key={quote.quote_id}
                quote={quote}
                selectedJobId={selectedJobMap[quote.quote_id]}
                onSelectJob={(jobId) => setSelectedJobMap(prev => ({
                  ...prev,
                  [quote.quote_id]: jobId
                }))}
                onAssign={() => assignMutation.mutate({
                  quote_id: quote.quote_id,
                  job_id: selectedJobMap[quote.quote_id]
                })}
                isAssigning={assignMutation.isPending && assignMutation.variables?.quote_id === quote.quote_id}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orphanedCount === 0 && (
          <Card className="border-2 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200 mb-2">
                ✅ All Quotes Resolved!
              </h3>
              <p className="text-green-800 dark:text-green-300">
                No orphaned quotes remaining. System is ready for Job SSOT enforcement.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Quote Card Component
function OrphanedQuoteCard({ quote, selectedJobId, onSelectJob, onAssign, isAssigning }) {
  return (
    <Card className="border-2 border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {quote.quote_number}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {quote.customer_name}
              </span>
              <Badge variant="outline" className="text-xs">
                {quote.job_name}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              ${quote.total?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(quote.created_date).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Matching Jobs */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Existing Jobs with Same Name & Customer:
          </label>

          {quote.matching_jobs.length === 0 ? (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-400">
              No existing Jobs found with same name + customer
            </div>
          ) : (
            <div className="space-y-2">
              {quote.matching_jobs.map((job) => (
                <label
                  key={job.job_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedJobId === job.job_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`job-${quote.quote_id}`}
                    value={job.job_id}
                    checked={selectedJobId === job.job_id}
                    onChange={() => onSelectJob(job.job_id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {job.job_number || job.name}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Status: <span className="font-semibold">{job.status}</span> •
                      Source: <span className="font-semibold">{job.backfill_source || 'manual'}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Or Leave Unassigned */}
        <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 cursor-pointer hover:border-slate-400 transition">
          <input
            type="radio"
            name={`job-${quote.quote_id}`}
            value="none"
            checked={selectedJobId === undefined || selectedJobId === 'none'}
            onChange={() => onSelectJob(undefined)}
            className="w-4 h-4"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">Leave Unassigned</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Requires new Job creation (manual process)
            </div>
          </div>
        </label>

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={onAssign}
            disabled={selectedJobId === undefined || isAssigning}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAssigning ? 'Assigning...' : 'Assign Job'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}