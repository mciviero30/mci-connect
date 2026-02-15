import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Lazy Loading Hook for Large Lists
 * Loads data in batches as user scrolls
 */
export function useLazyDataLoader(fetchFunction, initialBatchSize = 20, batchIncrement = 20) {
  const [data, setData] = useState([]);
  const [displayCount, setDisplayCount] = useState(initialBatchSize);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Initial data fetch
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFunction();
        setData(result);
        setHasMore(result.length > initialBatchSize);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();
  }, [fetchFunction, initialBatchSize]);

  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      const nextCount = displayCount + batchIncrement;
      setDisplayCount(nextCount);
      setHasMore(nextCount < data.length);
    }
  }, [inView, hasMore, isLoading, displayCount, batchIncrement, data.length]);

  const displayedData = data.slice(0, displayCount);

  return {
    data: displayedData,
    allData: data,
    loadMoreRef,
    isLoading,
    hasMore,
    totalCount: data.length,
    displayedCount: displayedData.length,
  };
}

/**
 * Virtualized List Component for Large Datasets
 */
export function VirtualizedList({ items, renderItem, itemHeight = 80 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  useEffect(() => {
    const container = document.getElementById('virtualized-container');
    if (container) {
      setContainerHeight(container.clientHeight);
    }
  }, []);

  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      id="virtualized-container"
      onScroll={handleScroll}
      className="overflow-y-auto h-full"
      style={{ position: 'relative' }}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}