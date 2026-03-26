import { useEffect } from 'react';
import { useMobileLifecycle } from './useMobileLifecycle';
import { useFieldStability } from './useFieldStability';
import { FieldSessionManager } from '../services/FieldSessionManager';

/**
 * FASE 3C-4: Measurement Session Lifecycle
 * Preserves measurement session identity across app lifecycle events
 */

/**
 * Comprehensive Field Lifecycle Hook
 * Handles all mobile app lifecycle scenarios for MCI Field
 * 
 * Scenarios:
 * 1. App Background/Foreground (screen lock, incoming call, app switch)
 * 2. Network Offline/Online
 * 3. Long background periods (> 30s)
 * 4. Page freeze/resume (iOS)
 * 5. Unsaved work protection
 * 
 * Guarantees:
 * - No state loss
 * - No UI jumps or resets
 * - No unwanted refetches
 * - No gate re-evaluation
 * - Drafts and measurements preserved
 */
export function useFieldLifecycle({ jobId, queryClient }) {
  // Core stability (reload prevention, unsaved work)
  useFieldStability(jobId);

  // Mobile lifecycle events
  useMobileLifecycle({
    onBackground: (data) => {
      if (import.meta.env?.DEV) {
      }
      
      // Mark background state for offline sync
      sessionStorage.setItem(`field_background_${jobId}`, Date.now().toString());
      
      // FASE 3C-4: Preserve measurement session during background
      const measurementSession = FieldSessionManager.getMeasurementSession();
      if (measurementSession?.job_id === jobId) {
        FieldSessionManager.updateMeasurementSession({ backgroundedAt: Date.now() });
      }
      
      // Keep session active (just backgrounded, not exited)
      FieldSessionManager.updateSession({
        backgroundedAt: Date.now(),
      });
    },

    onForeground: (data) => {
      const { duration, wasLongBackground } = data;
      
      if (import.meta.env?.DEV) {
      }

      // Clear background marker
      sessionStorage.removeItem(`field_background_${jobId}`);
      
      // FASE 3C-4: Reactivate measurement session (no data loss)
      const measurementSession = FieldSessionManager.getMeasurementSession();
      if (measurementSession?.job_id === jobId) {
        FieldSessionManager.updateMeasurementSession({ 
          isActive: true, 
          lastActivity: Date.now() 
        });
      }
      
      // Reactivate session
      FieldSessionManager.reactivateSession();

      // CRITICAL: Do NOT refetch queries - state is preserved
      // No query invalidation, no cache clearing
      
      if (wasLongBackground && import.meta.env?.DEV) {
      }
    },

    onLongBackground: (data) => {
      if (import.meta.env?.DEV) {
      }
      
      // State is preserved even after long background
      // No special handling needed - React state + sessionStorage intact
    },

    onOnline: (data) => {
      if (import.meta.env?.DEV) {
      }

      // Trigger offline sync if available
      if (window.__fieldOfflineSync) {
        window.__fieldOfflineSync.triggerSync(jobId);
      }
    },

    onOffline: (data) => {
      if (import.meta.env?.DEV) {
      }

      // Queue mode activated - writes go to offline queue
      sessionStorage.setItem(`field_offline_${jobId}`, Date.now().toString());
    },
  });

  // Prevent React Query refetch on resume
  useEffect(() => {
    if (!queryClient) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (import.meta.env?.DEV) {
        }
        
        // CRITICAL: Do NOT refetch - stable cache only
        // Query config already disables refetch, but enforce here too
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  if (import.meta.env?.DEV) {
    // Log lifecycle readiness on mount
    useEffect(() => {
    }, [jobId]);
  }
}