import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * TRUE Backend Pagination Hook
 * Uses listInvoicesPaginated / listQuotesPaginated backend functions
 * with cursor-based navigation. Prefetches next page for instant UX.
 *
 * @param {string} functionName - 'listInvoicesPaginated' | 'listQuotesPaginated'
 * @param {object} filters      - server-side filters passed to backend
 * @param {number} pageSize     - items per page (max 200)
 * @param {boolean} enabled     - whether to run the query
 *
 * FIX #1 (TQ v5): keepPreviousData → placeholderData: keepPreviousData
 * FIX #2 (cursor reset): when filters change, reset cursorStack to [null]
 * FIX #3 (stable queryKey): serialize filters to prevent infinite refetch loops
 */
export function useBackendPagination({
  functionName,
  filters = {},
  pageSize = 25,
  enabled = true,
}) {
  const queryClient = useQueryClient();

  // Stable serialization of filters for deep comparison
  const serializedFilters = useMemo(
    () => JSON.stringify(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters)]
  );

  // cursors[0] = null (first page), cursors[1] = nextCursor of page 0, etc.
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(0);

  // FIX #2: When filters change (new search term, status filter, etc.)
  // reset the cursor stack so we start from page 1 of the new results
  const prevSerializedFilters = useRef(serializedFilters);
  useEffect(() => {
    if (prevSerializedFilters.current !== serializedFilters) {
      prevSerializedFilters.current = serializedFilters;
      setCursorStack([null]);
      setPageIndex(0);
      prefetched.current.clear();
    }
  }, [serializedFilters]);

  const currentCursor = cursorStack[pageIndex] ?? null;

  // FIX #3: Use serializedFilters in queryKey for stable deep comparison
  const queryKey = [functionName, serializedFilters, pageSize, currentCursor];

  const fetchPage = useCallback(async (cursor) => {
    const parsedFilters = JSON.parse(serializedFilters);
    const res = await base44.functions.invoke(functionName, {
      limit: pageSize,
      cursor,
      filters: parsedFilters,
    });
    // base44 functions.invoke wraps response in { data: ... }
    const data = res?.data ?? res;
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid response from ' + functionName);
    }
    return data;
  }, [functionName, pageSize, serializedFilters]);

  // FIX #1: TanStack Query v5 uses placeholderData: keepPreviousData (imported helper)
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchPage(currentCursor),
    enabled: !!functionName && enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const nextCursorFromServer = data?.nextCursor ?? null;

  // Prefetch next page when we know the cursor
  const prefetched = useRef(new Set());
  if (hasMore && nextCursorFromServer) {
    const key = JSON.stringify([functionName, serializedFilters, pageSize, nextCursorFromServer]);
    if (!prefetched.current.has(key)) {
      prefetched.current.add(key);
      queryClient.prefetchQuery({
        queryKey: [functionName, serializedFilters, pageSize, nextCursorFromServer],
        queryFn: () => fetchPage(nextCursorFromServer),
        staleTime: 60 * 1000,
      });
    }
  }

  const nextPage = useCallback(() => {
    if (!hasMore || !nextCursorFromServer) return;
    setCursorStack(prev => {
      const next = [...prev];
      if (next[pageIndex + 1] !== undefined) {
        // already have cursor for this page — reuse
      } else {
        next.push(nextCursorFromServer);
      }
      return next;
    });
    setPageIndex(p => p + 1);
  }, [hasMore, nextCursorFromServer, pageIndex]);

  const prevPage = useCallback(() => {
    if (pageIndex <= 0) return;
    setPageIndex(p => p - 1);
  }, [pageIndex]);

  const resetPagination = useCallback(() => {
    setCursorStack([null]);
    setPageIndex(0);
    prefetched.current.clear();
    queryClient.invalidateQueries({ queryKey: [functionName] });
  }, [functionName, queryClient]);

  return {
    items,
    isLoading: isLoading || isFetching,
    error,
    page: pageIndex + 1,
    hasMore,
    hasPrevious: pageIndex > 0,
    nextPage,
    prevPage,
    resetPagination,
    totalDisplayed: items.length,
  };
}
