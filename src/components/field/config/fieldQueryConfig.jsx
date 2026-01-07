/**
 * MCI Field Query Configuration
 * Isolated query settings to prevent global side effects
 */

// Standard stable query configuration for Field
export const FIELD_STABLE_QUERY_CONFIG = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

// Short-lived query config (for frequently updated data)
export const FIELD_SHORT_CACHE_CONFIG = {
  staleTime: 60000, // 1 minute
  gcTime: 300000, // 5 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

// Field-scoped query key prefixes
export const FIELD_QUERY_KEYS = {
  USER: (jobId) => ['field-currentUser', jobId],
  JOB: (jobId) => ['field-job', jobId],
  TASKS: (jobId) => ['field-tasks', jobId],
  WORK_UNITS: (jobId) => ['work-units', jobId],
  PLANS: (jobId) => ['field-plans', jobId],
  PHOTOS: (jobId) => ['field-photos', jobId],
  DOCUMENTS: (jobId) => ['field-documents', jobId],
  MEMBERS: (jobId) => ['field-members', jobId],
  TEAM_MEMBERS: (jobId) => ['field-team-members', jobId],
  CHAT: (jobId) => ['chat-messages', jobId],
  COMPARISONS: (jobId) => ['field-photo-comparisons', jobId],
  ASSIGNMENTS: (jobId) => ['user-job-access', jobId],
  CUSTOMERS: () => ['field-customers'],
  JOBS: () => ['field-jobs'],
};

/**
 * Invalidate Field-scoped queries only
 * Prevents global query invalidation side effects
 */
export function invalidateFieldQueries(queryClient, jobId, queryTypes = []) {
  if (queryTypes.length === 0) {
    // Invalidate all Field queries for this job
    Object.values(FIELD_QUERY_KEYS).forEach(keyFn => {
      try {
        const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
        queryClient.invalidateQueries({ queryKey: key, exact: true });
      } catch (e) {
        console.error('Failed to invalidate query:', e);
      }
    });
  } else {
    // Invalidate specific query types
    queryTypes.forEach(type => {
      const keyFn = FIELD_QUERY_KEYS[type];
      if (keyFn) {
        const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
        queryClient.invalidateQueries({ queryKey: key, exact: true });
      }
    });
  }
}

/**
 * Update Field query data optimistically
 * Avoids invalidation entirely
 */
export function updateFieldQueryData(queryClient, jobId, queryType, updater) {
  const keyFn = FIELD_QUERY_KEYS[queryType];
  if (!keyFn) {
    console.error(`Unknown Field query type: ${queryType}`);
    return;
  }

  const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
  queryClient.setQueryData(key, updater);
}