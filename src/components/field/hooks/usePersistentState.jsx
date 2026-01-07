import { useState, useEffect, useRef } from 'react';

/**
 * Hook for persistent state that survives app interruptions
 * Uses localStorage with automatic cleanup
 */
export function usePersistentState(key, initialValue, options = {}) {
  const {
    expiryHours = 24,
    persist = true,
    onRestore = null,
  } = options;

  const [state, setState] = useState(() => {
    if (!persist || typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check expiry
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          localStorage.removeItem(key);
          return initialValue;
        }
        
        if (onRestore) {
          onRestore(parsed.value);
        }
        
        return parsed.value;
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }

    return initialValue;
  });

  const saveTimeoutRef = useRef(null);

  // Auto-save on state change
  useEffect(() => {
    if (!persist || typeof window === 'undefined') return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save after 500ms of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const data = {
          value: state,
          timestamp: Date.now(),
          expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, key, persist, expiryHours]);

  // Immediate save on visibility change
  useEffect(() => {
    if (!persist) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          const data = {
            value: state,
            timestamp: Date.now(),
            expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
          };
          localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
          console.error('Failed to persist on background:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [key, state, persist, expiryHours]);

  // Clear state
  const clearState = () => {
    if (persist) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Failed to clear state:', error);
      }
    }
    setState(initialValue);
  };

  return [state, setState, clearState];
}

/**
 * Clean up expired persistent states
 * Call this on app initialization
 */
export function cleanupExpiredStates() {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.expiresAt && parsed.expiresAt < now) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
  } catch (error) {
    console.error('Failed to cleanup expired states:', error);
  }
}

// Run cleanup on module load
if (typeof window !== 'undefined') {
  cleanupExpiredStates();
}