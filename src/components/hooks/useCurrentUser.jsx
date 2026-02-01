import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

/**
 * Centralized hook to avoid repeated user queries in every component
 * Uses the same cache key as Layout so data is shared
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get user synchronously from cache (no hook, for non-component contexts)
 */
export function getCurrentUserFromCache(queryClient) {
  return queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
}