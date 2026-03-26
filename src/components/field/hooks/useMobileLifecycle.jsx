import { useEffect, useRef } from 'react';
import { mobileLifecycle } from '../services/MobileLifecycleManager';

/**
 * Hook to handle mobile app lifecycle events
 * Prevents state loss during background/foreground transitions
 * 
 * Handles:
 * - App background/foreground (screen lock, app switch)
 * - Long background periods (> 30s)
 * - Network online/offline
 */
export function useMobileLifecycle(callbacks = {}) {
  const {
    onBackground,
    onForeground,
    onLongBackground, // Background > 30s
    onOnline,
    onOffline,
  } = callbacks;

  const backgroundTimeRef = useRef(null);

  useEffect(() => {
    const unsubscribeBackground = mobileLifecycle.on('background', (data) => {
      backgroundTimeRef.current = Date.now();
      
      if (import.meta.env?.DEV) {
      }
      
      if (onBackground) {
        try {
          onBackground(data);
        } catch (error) {
          console.error('Background callback error:', error);
        }
      }
    });

    const unsubscribeForeground = mobileLifecycle.on('foreground', (data) => {
      const { duration, wasLongBackground } = data;
      
      if (import.meta.env?.DEV) {
      }
      
      if (onForeground) {
        try {
          onForeground(data);
        } catch (error) {
          console.error('Foreground callback error:', error);
        }
      }

      // Check if it was a long background (> 30s)
      if (wasLongBackground && onLongBackground) {
        try {
          onLongBackground(data);
        } catch (error) {
          console.error('Long background callback error:', error);
        }
      }

      backgroundTimeRef.current = null;
    });

    const unsubscribeOnline = mobileLifecycle.on('online', (data) => {
      if (import.meta.env?.DEV) {
      }
      
      if (onOnline) {
        try {
          onOnline(data);
        } catch (error) {
          console.error('Online callback error:', error);
        }
      }
    });

    const unsubscribeOffline = mobileLifecycle.on('offline', (data) => {
      if (import.meta.env?.DEV) {
      }
      
      if (onOffline) {
        try {
          onOffline(data);
        } catch (error) {
          console.error('Offline callback error:', error);
        }
      }
    });

    return () => {
      unsubscribeBackground();
      unsubscribeForeground();
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [onBackground, onForeground, onLongBackground, onOnline, onOffline]);

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