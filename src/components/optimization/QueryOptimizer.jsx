import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Query Optimization Utilities
 * Reduces redundant API calls and improves performance
 */

// Optimized query config for large datasets
export const OPTIMIZED_QUERY_CONFIG = {
  // Heavy data - fetch once, cache long
  heavyData: {
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Medium data - balanced
  mediumData: {
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Light data - frequent updates
  lightData: {
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  },
};

/**
 * Memoized filter for large arrays
 * Prevents re-filtering on every render
 */
export function useOptimizedFilter(data, filterFn, dependencies = []) {
  return useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter(filterFn);
  }, [data, ...dependencies]);
}

/**
 * Debounced search to reduce API calls
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Batched updates - collect multiple updates and apply at once
 */
export class UpdateBatcher {
  constructor(flushInterval = 1000) {
    this.queue = [];
    this.flushInterval = flushInterval;
    this.timer = null;
  }

  add(updateFn) {
    this.queue.push(updateFn);
    
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  flush() {
    const updates = [...this.queue];
    this.queue = [];
    clearTimeout(this.timer);
    this.timer = null;

    // Execute all updates in batch
    Promise.all(updates.map(fn => fn())).catch(error => {
      console.error('Batched update failed:', error);
    });
  }
}