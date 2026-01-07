import { useEffect, useCallback } from 'react';

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