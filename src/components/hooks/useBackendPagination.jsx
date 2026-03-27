import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useRef } from 'react';

/**
 * TRUE Backend Pagination Hook
 * Uses listInvoicesPaginated / listQuotesPaginated backend functions
 * with cursor-based navigation. Prefetches next page for instant UX.
 *
 * @param {string} functionName - 'listInvoicesPaginated' | 'listQuotesPaginated'
 * @param {object} filters      - server-side filters passed to backend
 * @param {number} pageSize     - items per page (max 200)
 * @param {boolean} enabled     - whether to run the query
 */
export function useBackendPagination({
  functionName,
  filters = {},
  pageSize = 25,
  enabled = true,
}) {
  const queryClient = useQueryClient();
  // cursors[0] = null (first page), cursors[1] = nextCursor of page 0, etc.
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(0);

  const currentCursor = cursorStack[pageIndex] ?? null;

  const queryKey = [functionName, filters, pageSize, currentCursor];

  const fetchPage = useCallback(async (cursor) => {
    const res = await base44.functions.invoke(functionName, {
      limit: pageSize,
      cursor,
      filters,
    });
    // base44 functions.invoke wraps response in { data: ... }
    const data = res?.data ?? res;
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid response from ' + functionName);
    }
    return data;
  }, [functionName, pageSize, JSON.stringify(filters)]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchPage(currentCursor),
    enabled: !!functionName && enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const nextCursorFromServer = data?.nextCursor ?? null;

  // Prefetch next page when we know the cursor
  const prefetched = useRef(new Set());
  if (hasMore && nextCursorFromServer) {
    const key = JSON.stringify([functionName, filters, pageSize, nextCursorFromServer]);
    if (!prefetched.current.has(key)) {
      prefetched.current.add(key);
      queryClient.prefetchQuery({
        queryKey: [functionName, filters, pageSize, nextCursorFromServer],
        queryFn: () => fetchPage(nextCursorFromServer),
        staleTime: 60 * 1000,
      });
    }
  }

  const nextPage = useCallback(() => {
    if (!hasMore || !nextCursorFromServer) return;
    setCursorStack(prev => {
      const next = [...prev];
      // If we're going forward into known territory, reuse; otherwise append
      if (next[pageIndex + 1] !== undefined) {
        // already have it
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
