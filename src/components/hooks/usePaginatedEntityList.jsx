import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useEffect } from 'react';

/**
 * CLIENT-SIDE PAGINATION HOOK
 * Uses entity.filter() for data fetching with client-side pagination
 * 
 * @param {string} entityName - Entity name (Invoice, Quote, Job)
 * @param {object} filters - Filters to apply
 * @param {number} pageSize - Items per page (default: 50)
 * @param {object} queryOptions - Additional React Query options
 * @returns {object} { items, isLoading, loadMore, hasMore, totalLoaded, refetch }
 */
export function usePaginatedEntityList({
  entityName,
  filters = {},
  pageSize = 50,
  queryOptions = {}
}) {
  const [displayLimit, setDisplayLimit] = useState(pageSize);
  const queryClient = useQueryClient();

  // Fetch all data with filters
  const { data: allItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['entityList', entityName, filters],
    queryFn: async () => {
      // Defensive check: ensure entityName is valid
      if (!entityName || typeof entityName !== 'string') {
        console.error('[usePaginatedEntityList] Invalid entityName:', entityName);
        return [];
      }

      try {
        // Use entity filter or list based on filters
        if (Object.keys(filters).length > 0) {
          return await base44.entities[entityName].filter(filters, '-created_date', 500);
        } else {
          return await base44.entities[entityName].list('-created_date', 500);
        }
      } catch (err) {
        console.error(`[usePaginatedEntityList] Error fetching ${entityName}:`, err);
        return [];
      }
    },
    enabled: !!entityName,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
    ...queryOptions
  });

  // Client-side pagination: slice items based on displayLimit
  const displayedItems = allItems.slice(0, displayLimit);
  const hasMore = displayedItems.length < allItems.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setDisplayLimit(prev => prev + pageSize);
    }
  }, [hasMore, isLoading, pageSize]);

  const resetPagination = useCallback(() => {
    setDisplayLimit(pageSize);
    refetch();
  }, [refetch, pageSize]);

  return {
    items: displayedItems,
    isLoading,
    error,
    loadMore,
    hasMore,
    totalLoaded: displayedItems.length,
    pageSize,
    refetch: resetPagination
  };
}