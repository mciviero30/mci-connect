import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Render Optimization Hook
 * Prevents unnecessary re-renders and optimizes performance
 * 
 * Features:
 * - Stable reference tracking
 * - Re-render counting (dev only)
 * - Expensive computation memoization
 * - Callback stabilization
 */
export function useRenderOptimization(componentName, deps = []) {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderRef.current;
    
    if (import.meta.env?.DEV && timeSinceLastRender < 16) {
      // Rendering faster than 60fps - possible render loop
    }
    
    lastRenderRef.current = now;
  });

  // Log render count on unmount (dev only)
  useEffect(() => {
    return () => {
      if (import.meta.env?.DEV && renderCountRef.current > 50) {
      }
    };
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
  };
}

/**
 * Stable Callback Hook
 * Creates callbacks that don't change reference unless deps change
 * More aggressive than useCallback - uses ref to ensure stability
 */
export function useStableCallback(callback, deps = []) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);
  
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []);
}

/**
 * Expensive Computation Hook
 * Memoizes expensive computations with change detection
 */
export function useExpensiveComputation(computeFn, deps, label = 'computation') {
  const lastDepsRef = useRef(deps);
  const lastResultRef = useRef(null);
  const computeCountRef = useRef(0);

  return useMemo(() => {
    const start = performance.now();
    const result = computeFn();
    const duration = performance.now() - start;
    
    computeCountRef.current++;
    
    if (import.meta.env?.DEV && duration > 10) {
    }
    
    lastResultRef.current = result;
    return result;
  }, deps);
}

/**
 * List Virtualization Helper
 * Calculates visible range for large lists
 */
export function useListVirtualization({ 
  itemCount, 
  itemHeight, 
  containerHeight, 
  overscan = 5 
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2);
    const end = Math.min(itemCount, start + visibleCount);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = itemCount * itemHeight;

  return {
    visibleRange,
    handleScroll,
    totalHeight,
    offsetY: visibleRange.start * itemHeight,
  };
}