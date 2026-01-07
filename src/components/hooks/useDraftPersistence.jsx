import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

/**
 * Auto-save draft to localStorage with debouncing
 * Restores draft on mount and warns before unload
 */
export function useDraftPersistence({
  draftKey,
  formData,
  enabled = true,
  onRestore,
  debounceMs = 1000,
}) {
  const hasChangesRef = useRef(false);
  const initialLoadRef = useRef(false);

  // Restore draft on mount
  useEffect(() => {
    if (!enabled || initialLoadRef.current) return;
    initialLoadRef.current = true;

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
          onRestore?.(parsed.data);
        } else {
          // Clear old draft
          localStorage.removeItem(draftKey);
        }
      }
    } catch (error) {
      console.error('Failed to restore draft:', error);
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, enabled, onRestore]);

  // Debounced save function
  const saveDraft = useCallback(
    debounce((data) => {
      if (!enabled) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        hasChangesRef.current = true;
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, debounceMs),
    [draftKey, enabled, debounceMs]
  );

  // Auto-save on formData change
  useEffect(() => {
    if (!enabled || !formData) return;
    saveDraft(formData);
  }, [formData, saveDraft, enabled]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      hasChangesRef.current = false;
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [draftKey]);

  // Warn before unload if unsaved changes
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  return { clearDraft };
}