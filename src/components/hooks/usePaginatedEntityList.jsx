import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useEffect } from 'react';

/**
 * TRUE SERVER-SIDE CURSOR-BASED PAGINATION HOOK
 * Uses backend functions for real pagination (no client-side slice)
 * 
 * @param {string} entityName - Entity name (Invoice, Quote, Job)
 * @param {object} filters - Server-side filters
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
  const [pages, setPages] = useState([]);
  const [cursors, setCursors] = useState([null]); // [null, cursor1, cursor2, ...]
  const queryClient = useQueryClient();

  const currentPageIndex = pages.length;
  const currentCursor = cursors[currentPageIndex] || null;

  // Query key includes current cursor to trigger refetch on loadMore
  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: ['paginated', entityName, filters, currentCursor, pageSize],
    queryFn: async () => {
      // Defensive check: ensure entityName is valid
      if (!entityName || typeof entityName !== 'string') {
        console.error('[usePaginatedEntityList] Invalid entityName:', entityName);
        return { items: [], hasMore: false, nextCursor: null };
      }

      // Call backend pagination function
      const functionName = `list${entityName}sPaginated`;
      
      try {
        const result = await base44.functions.invoke(functionName, {
          limit: pageSize,
          cursor: currentCursor,
          filters
        });
        return result;
      } catch (err) {
        console.error(`[usePaginatedEntityList] Error calling ${functionName}:`, err);
        // Return empty result on error to prevent crash
        return { items: [], hasMore: false, nextCursor: null };
      }
    },
    enabled: !!entityName && currentPageIndex === pages.length, // Only fetch if entityName valid and we need this page
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false, // Don't retry failed pagination calls
    ...queryOptions
  });

  // When new page data arrives, add to pages
  useEffect(() => {
    if (pageData?.items && pageData.items.length > 0) {
      setPages(prev => {
        // Check if this page is already added (avoid duplicates)
        const lastPage = prev[prev.length - 1];
        if (lastPage && lastPage[0]?.id === pageData.items[0]?.id) {
          return prev; // Already have this page
        }
        return [...prev, pageData.items];
      });

      // Add next cursor
      if (pageData.nextCursor) {
        setCursors(prev => {
          const lastCursor = prev[prev.length - 1];
          const isSameCursor = lastCursor && 
            lastCursor.created_date === pageData.nextCursor.created_date &&
            lastCursor.id === pageData.nextCursor.id;
          
          if (!isSameCursor) {
            return [...prev, pageData.nextCursor];
          }
          return prev;
        });
      }
    }
  }, [pageData]);

  // Flatten all pages into single array
  const allItems = pages.flat();

  // Deduplicate by id (safety check)
  const uniqueItems = Array.from(
    new Map(allItems.map(item => [item.id, item])).values()
  );

  const hasMore = pageData?.hasMore || false;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      // Trigger next page fetch by incrementing page count
      queryClient.invalidateQueries({ 
        queryKey: ['paginated', entityName, filters, cursors[pages.length], pageSize] 
      });
    }
  }, [hasMore, isLoading, entityName, filters, pages.length, cursors, pageSize, queryClient]);

  const resetPagination = useCallback(() => {
    setPages([]);
    setCursors([null]);
    refetch();
  }, [refetch]);

  return {
    items: uniqueItems,
    isLoading,
    error,
    loadMore,
    hasMore,
    totalLoaded: uniqueItems.length,
    pageSize,
    refetch: resetPagination
  };
}