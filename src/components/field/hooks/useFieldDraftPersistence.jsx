/**
 * QW4: Field Draft Persistence Hook
 * 
 * CRITICAL: Ensures zero data loss for in-memory drafts
 * Auto-saves form state to sessionStorage every N seconds
 * Recovers on mount (crash recovery)
 */

import { useEffect, useRef, useCallback } from 'react';
import { FieldSessionManager } from '@/components/field/services/FieldSessionManager';

const AUTOSAVE_INTERVAL_MS = 3000; // Save every 3 seconds

/**
 * QW4: Auto-persist form drafts for crash recovery
 * 
 * @param {string} draftKey - Unique key for this draft (e.g., 'task_create_job123')
 * @param {object} draftData - Current form state
 * @param {function} setDraftData - Setter to restore state
 * @param {object} options - { enabled: boolean, jobId: string }
 */
export function useFieldDraftPersistence(draftKey, draftData, setDraftData, options = {}) {
  const { enabled = true, jobId } = options;
  const lastSaveRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  // Construct storage key
  const storageKey = `field_draft_${draftKey}${jobId ? `_${jobId}` : ''}`;

  // QW4: Recover draft on mount (crash recovery)
  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Only restore if data is fresh (< 24 hours old)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
          setDraftData(parsed.data);
          console.log(`[Draft Recovery] ✅ Restored ${draftKey}`);
        } else {
          // Clean up stale draft
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('[Draft Recovery] Failed:', error);
    }
  }, [enabled, storageKey, setDraftData, draftKey]);

  // QW4: Auto-save draft periodically
  const saveDraft = useCallback(() => {
    if (!enabled || !draftData) return;

    // Don't save if data is empty
    const hasData = Object.values(draftData).some(val => 
      val !== null && val !== undefined && val !== ''
    );

    if (!hasData) {
      // Clear draft if empty
      sessionStorage.removeItem(storageKey);
      return;
    }

    try {
      const payload = {
        data: draftData,
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      lastSaveRef.current = Date.now();
      
      // Also register in session manager
      FieldSessionManager.updateSession({
        unsavedWork: {
          drafts: [
            ...(FieldSessionManager.getSession()?.unsavedWork?.drafts || []).filter(d => d.key !== draftKey),
            { key: draftKey, timestamp: Date.now() }
          ]
        }
      });
    } catch (error) {
      console.error('[Draft Autosave] Failed:', error);
    }
  }, [enabled, draftData, storageKey, draftKey]);

  // QW4: Auto-save every 3 seconds
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    // Set new timer
    autosaveTimerRef.current = setInterval(saveDraft, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
        // Final save on unmount
        saveDraft();
      }
    };
  }, [enabled, saveDraft]);

  // QW4: Clear draft manually
  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    
    // Remove from session manager
    const session = FieldSessionManager.getSession();
    if (session?.unsavedWork?.drafts) {
      FieldSessionManager.updateSession({
        unsavedWork: {
          drafts: session.unsavedWork.drafts.filter(d => d.key !== draftKey)
        }
      });
    }
  }, [storageKey, draftKey]);

  return {
    saveDraft,
    clearDraft,
    lastSave: lastSaveRef.current,
  };
}