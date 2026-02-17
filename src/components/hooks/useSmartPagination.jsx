import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback, useMemo } from 'react';

/**
 * Smart Pagination Hook - Loads all records, paginates on frontend
 */
export function useSmartPagination({
  entityName,
  filters = {},
  sortBy = '-created_date',
  pageSize = 20,
  enabled = true
}) {
  const [page, setPage] = useState(1);

  // Fetch ALL records (no skip - SDK doesn't support it)
  const { data: allItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['paginated', entityName, filters, sortBy],
    queryFn: async () => {
      const results = Object.keys(filters).length > 0
        ? await base44.entities[entityName].filter(filters, sortBy, 500)
        : await base44.entities[entityName].list(sortBy, 500);
      return results;
    },
    enabled: !!entityName && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Paginate on the frontend
  const { items, hasMore, hasPrevious } = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: allItems.slice(start, end),
      hasMore: end < allItems.length,
      hasPrevious: page > 1,
    };
  }, [allItems, page, pageSize]);

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
    setPage(1);
    refetch();
  }, [refetch]);

  return {
    items,
    isLoading,
    error,
    page,
    hasMore,
    hasPrevious,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
    totalDisplayed: items.length,
    totalCount: allItems.length,
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