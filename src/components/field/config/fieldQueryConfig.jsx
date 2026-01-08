/**
 * MCI Field Query Configuration
 * Isolated query settings to prevent global side effects
 */

// CRITICAL: Import query keys from centralized file
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';

// Re-export for backward compatibility
export { FIELD_QUERY_KEYS };

// Standard stable query configuration for Field
// CRITICAL: Prevents all refetches - essential for mobile lifecycle stability
export const FIELD_STABLE_QUERY_CONFIG = {
  staleTime: Infinity,          // Data never goes stale
  gcTime: Infinity,              // Cache never garbage collected
  refetchOnMount: false,         // No refetch when component mounts
  refetchOnWindowFocus: false,   // No refetch on app foreground
  refetchOnReconnect: false,     // No refetch on network reconnect
  refetchInterval: false,        // No polling
  retry: false,                  // No retries (fail fast)
};

// Short-lived query config (for frequently updated data)
export const FIELD_SHORT_CACHE_CONFIG = {
  staleTime: 60000, // 1 minute
  gcTime: 300000, // 5 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
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