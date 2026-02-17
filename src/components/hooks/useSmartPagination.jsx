import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useMemo, useRef } from 'react';

// Backend paginator function names per entity
const BACKEND_PAGINATORS = {
  Quote: 'listQuotesPaginated',
  Invoice: 'listInvoicesPaginated',
  Job: 'listJobsPaginated',
};

/**
 * Smart Pagination Hook
 * - Uses backend cursor-based pagination if a paginator function exists for the entity
 * - Falls back to loading all records (up to 500) for entities without a paginator
 */
export function useSmartPagination({
  entityName,
  filters = {},
  sortBy = '-created_date',
  pageSize = 20,
  enabled = true
}) {
  const [page, setPage] = useState(1);
  // Stack of cursors: index 0 = page 1 cursor (null), index N = cursor to fetch page N+1
  const cursorsRef = useRef([null]);

  const backendFn = BACKEND_PAGINATORS[entityName];

  // ── Backend cursor pagination (Quote, Invoice, Job) ──────────────────────
  const backendQuery = useQuery({
    queryKey: ['paginated-cursor', entityName, filters, page],
    queryFn: async () => {
      const cursor = cursorsRef.current[page - 1] ?? null;
      const activeFilters = { ...filters };
      delete activeFilters.deleted_at; // handled server-side

      const res = await base44.functions.invoke(backendFn, {
        limit: pageSize,
        cursor,
        filters: activeFilters,
      });
      const data = res?.data ?? res;

      // Store next cursor for the next page
      if (data.nextCursor) {
        cursorsRef.current[page] = data.nextCursor;
      }

      return data;
    },
    enabled: !!backendFn && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  // ── Fallback: load all (entities without a backend paginator) ────────────
  const fallbackQuery = useQuery({
    queryKey: ['paginated', entityName, filters, sortBy],
    queryFn: async () => {
      return Object.keys(filters).length > 0
        ? await base44.entities[entityName].filter(filters, sortBy, 500)
        : await base44.entities[entityName].list(sortBy, 500);
    },
    enabled: !backendFn && !!entityName && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const fallbackItems = fallbackQuery.data ?? [];
  const fallbackPaged = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: fallbackItems.slice(start, end),
      hasMore: end < fallbackItems.length,
    };
  }, [fallbackItems, page, pageSize]);

  // ── Unified return ───────────────────────────────────────────────────────
  const items     = backendFn ? (backendQuery.data?.items ?? [])   : fallbackPaged.items;
  const hasMore   = backendFn ? (backendQuery.data?.hasMore ?? false) : fallbackPaged.hasMore;
  const isLoading = backendFn ? backendQuery.isLoading : fallbackQuery.isLoading;
  const error     = backendFn ? backendQuery.error     : fallbackQuery.error;
  const refetch   = backendFn ? backendQuery.refetch   : fallbackQuery.refetch;

  const nextPage = useCallback(() => {
    if (hasMore) setPage(p => p + 1);
  }, [hasMore]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, newPage));
  }, []);

  const resetPagination = useCallback(() => {
    cursorsRef.current = [null];
    setPage(1);
    refetch();
  }, [refetch]);

  return {
    items,
    isLoading,
    error,
    page,
    hasMore,
    hasPrevious: page > 1,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
    totalDisplayed: items.length,
    totalCount: backendFn ? undefined : fallbackItems.length,
  };
}

/**
 * Pagination Controls Component
 */
export const PaginationControls = ({ 
  page, 
  hasMore, 
  hasPrevious, 
  onNext, 
  onPrevious,
  isLoading,
  language = 'en' 
}) => {
  return (
    <div className="flex justify-center items-center gap-3 mt-6">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious || isLoading}
        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all min-h-[44px]"
      >
        {language === 'es' ? 'Anterior' : 'Previous'}
      </button>
      
      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium px-3">
        {language === 'es' ? 'Página' : 'Page'} {page}
      </span>
      
      <button
        onClick={onNext}
        disabled={!hasMore || isLoading}
        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all min-h-[44px]"
      >
        {language === 'es' ? 'Siguiente' : 'Next'}
      </button>
    </div>
  );
};