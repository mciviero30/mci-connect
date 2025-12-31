import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useMemo } from 'react';

/**
 * Hook for paginated entity lists with "Load More" functionality
 * 
 * @param {string} entityName - Name of entity to fetch
 * @param {object} filters - Filter object (e.g., { status: 'active' })
 * @param {string} sort - Sort order (e.g., '-created_date')
 * @param {number} pageSize - Items per page (default: 50)
 * @param {object} queryOptions - Additional React Query options
 * @returns {object} { data, isLoading, error, loadMore, hasMore, totalDisplayed }
 */
export function usePaginatedEntityList(
  entityName, 
  filters = {}, 
  sort = '-created_date', 
  pageSize = 50,
  queryOptions = {}
) {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = pageSize * currentPage;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['entity-list', entityName, filters, sort, limit],
    queryFn: () => base44.entities[entityName].filter(filters, sort, limit),
    staleTime: 3 * 60 * 1000, // 3 min cache for large lists
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...queryOptions
  });

  const hasMore = items.length === limit;
  const totalDisplayed = items.length;

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return {
    data: items,
    isLoading,
    error,
    loadMore,
    hasMore,
    totalDisplayed,
    pageSize
  };
}

/**
 * Hook for simple paginated lists (discrete pages, not infinite scroll)
 * 
 * @param {string} entityName - Name of entity to fetch
 * @param {object} filters - Filter object
 * @param {string} sort - Sort order
 * @param {number} pageSize - Items per page (default: 50)
 * @returns {object} { data, isLoading, currentPage, totalPages, nextPage, prevPage, hasNext, hasPrev }
 */
export function useSimplePaginatedList(
  entityName,
  filters = {},
  sort = '-created_date',
  pageSize = 50
) {
  const [currentPage, setCurrentPage] = useState(1);
  const skip = (currentPage - 1) * pageSize;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['entity-page', entityName, filters, sort, currentPage, pageSize],
    queryFn: async () => {
      // Fetch one extra to check if more exist
      const results = await base44.entities[entityName].filter(filters, sort, pageSize + 1);
      return results;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const hasNext = items.length > pageSize;
  const displayItems = hasNext ? items.slice(0, pageSize) : items;

  return {
    data: displayItems,
    isLoading,
    currentPage,
    totalDisplayed: displayItems.length,
    hasNext,
    hasPrev: currentPage > 1,
    nextPage: () => hasNext && setCurrentPage(p => p + 1),
    prevPage: () => currentPage > 1 && setCurrentPage(p => p - 1),
    pageSize
  };
}