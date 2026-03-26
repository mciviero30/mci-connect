import { useEffect, useCallback } from 'react';
import { mobileLifecycle } from '../services/MobileLifecycleManager';

/**
 * DEPRECATED: Use useZeroDataLoss instead
 * This hook remains for backward compatibility only
 * 
 * Migration path:
 * const { loadDraft, clearDraft } = useDraftPersistence(key, value);
 * →
 * const { autosave, recover, clear } = useZeroDataLoss({ type, jobId });
 */
export function useDraftPersistence(key, value, enabled = true) {
  // Auto-save draft every 2 seconds
  useEffect(() => {
    if (!enabled || !value) return;

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(`draft_${key}`, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [key, value, enabled]);

  // ENHANCED: Save immediately on background
  useEffect(() => {
    if (!enabled || !value) return;

    const unsubscribe = mobileLifecycle.on('background', () => {
      try {
        sessionStorage.setItem(`draft_${key}`, JSON.stringify(value));
        if (import.meta.env?.DEV) {
        }
      } catch (error) {
        console.error('Background save failed:', error);
      }
    });

    return () => unsubscribe();
  }, [key, value, enabled]);

  // Load draft on mount
  const loadDraft = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(`draft_${key}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [key]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(`draft_${key}`);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key]);

  return { loadDraft, clearDraft };
}