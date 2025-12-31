import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

/**
 * Reusable paginated entity list hook
 * Handles infinite loading with consistent caching
 * 
 * @param {string} queryKey - Unique query identifier
 * @param {Function} fetchFn - Function to fetch data (receives pageParam)
 * @param {Object} options - Additional options
 * @returns {Object} - Paginated data with controls
 */
export function usePaginatedEntityList({
  queryKey,
  fetchFn,
  pageSize = 50,
  orderBy = '-created_date',
  filters = {},
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error
  } = useInfiniteQuery({
    queryKey: [queryKey, filters, orderBy],
    queryFn: async ({ pageParam = 0 }) => {
      const skip = pageParam * pageSize;
      const items = await fetchFn({ skip, limit: pageSize, orderBy, filters });
      
      return {
        items,
        nextCursor: items.length === pageSize ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });

  // Flatten all pages into single array
  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items);
  }, [data?.pages]);

  return {
    items: allItems,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore: fetchNextPage,
    refetch,
    error,
    totalLoaded: allItems.length
  };
}

/**
 * Simple paginated list (non-infinite, for smaller datasets)
 */
export function useSimplePaginatedList({
  queryKey,
  fetchFn,
  pageSize = 50,
  orderBy = '-created_date',
  filters = {},
  enabled = true,
  staleTime = 5 * 60 * 1000,
}) {
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [queryKey, filters, orderBy, page],
    queryFn: async () => {
      const skip = page * pageSize;
      return await fetchFn({ skip, limit: pageSize, orderBy, filters });
    },
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true
  });

  return {
    items: data || [],
    isLoading,
    refetch,
    page,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(0, p - 1)),
    resetPage: () => setPage(0),
    hasMore: (data || []).length === pageSize
  };
}