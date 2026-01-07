import { useEffect, useRef } from 'react';
import { mobileLifecycle } from '../services/MobileLifecycleManager';

/**
 * Hook to handle mobile app lifecycle events
 * Prevents state loss during background/foreground transitions
 */
export function useMobileLifecycle(callbacks = {}) {
  const {
    onBackground,
    onForeground,
    onLongBackground, // Background > 30s
  } = callbacks;

  const backgroundTimeRef = useRef(null);

  useEffect(() => {
    const unsubscribeBackground = mobileLifecycle.on('background', () => {
      backgroundTimeRef.current = Date.now();
      
      if (onBackground) {
        try {
          onBackground();
        } catch (error) {
          console.error('Background callback error:', error);
        }
      }
    });

    const unsubscribeForeground = mobileLifecycle.on('foreground', ({ duration }) => {
      if (onForeground) {
        try {
          onForeground({ duration });
        } catch (error) {
          console.error('Foreground callback error:', error);
        }
      }

      // Check if it was a long background (> 30s)
      if (duration > 30000 && onLongBackground) {
        try {
          onLongBackground({ duration });
        } catch (error) {
          console.error('Long background callback error:', error);
        }
      }

      backgroundTimeRef.current = null;
    });

    return () => {
      unsubscribeBackground();
      unsubscribeForeground();
    };
  }, [onBackground, onForeground, onLongBackground]);

  return mobileLifecycle.getState();
}

/**
 * Hook to prevent React Query refetches on app resume
 */
export function usePreventRefetchOnResume(queryClient) {
  useEffect(() => {
    const unsubscribeForeground = mobileLifecycle.on('foreground', () => {
      // Temporarily disable all query refetching
      queryClient.setDefaultOptions({
        queries: {
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchOnMount: false,
        },
      });

      // Re-enable after 2 seconds (after resume stabilizes)
      setTimeout(() => {
        queryClient.setDefaultOptions({
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
          },
        });
      }, 2000);
    });

    return () => unsubscribeForeground();
  }, [queryClient]);
}