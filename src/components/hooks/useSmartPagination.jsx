import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useCallback } from 'react';

/**
 * Smart Pagination Hook - Server-side pagination with intelligent caching
 * Optimized for large datasets (1000+ records)
 * 
 * @param {string} entityName - Entity name
 * @param {object} filters - Query filters
 * @param {number} pageSize - Items per page (default: 20)
 * @returns {object} Pagination controls and data
 */
export function useSmartPagination({
  entityName,
  filters = {},
  sortBy = '-created_date',
  pageSize = 20,
  enabled = true
}) {
  const [page, setPage] = useState(1);

  // Fetch only the current page
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['paginated', entityName, filters, sortBy, page, pageSize],
    queryFn: async () => {
      const skip = (page - 1) * pageSize;
      
      // Fetch pageSize + 1 to check if there's a next page
      const results = Object.keys(filters).length > 0
        ? await base44.entities[entityName].filter(filters, sortBy, pageSize + 1, skip)
        : await base44.entities[entityName].list(sortBy, pageSize + 1, skip);

      const hasMore = results.length > pageSize;
      const items = hasMore ? results.slice(0, pageSize) : results;

      return {
        items,
        hasMore,
        currentPage: page,
        pageSize
      };
    },
    enabled: !!entityName && enabled,
    staleTime: 2 * 60 * 1000, // 2 min cache
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true, // Smooth transitions between pages
  });

  const nextPage = useCallback(() => {
    if (data?.hasMore) {
      setPage(p => p + 1);
    }
  }, [data?.hasMore]);

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
    items: data?.items || [],
    isLoading,
    error,
    page,
    hasMore: data?.hasMore || false,
    hasPrevious: page > 1,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
    totalDisplayed: data?.items?.length || 0
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