import { useEffect, useRef } from 'react';

/**
 * Hook to prevent memory leaks from subscriptions
 * Automatically tracks and cleans up all subscriptions
 */
export const useSubscription = (subscriptionFn, deps = []) => {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up previous subscription if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new subscription
    unsubscribeRef.current = subscriptionFn();

    // Cleanup on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, deps);
};

/**
 * Hook to clean up intervals and timeouts
 */
export const useInterval = (callback, delay) => {
  const savedCallback = useRef();
  const intervalRef = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = setInterval(() => savedCallback.current(), delay);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [delay]);
};

/**
 * Hook to clean up event listeners
 */
export const useEventListener = (eventName, handler, element = window) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};