import { useState, useEffect, useCallback, useRef } from 'react';
import { fieldPersistence } from '../services/FieldStatePersistence';

/**
 * Hook for persistent form state in MCI Field
 * Automatically saves and restores state across interruptions
 */
export function useFieldPersistence(formId, jobId, initialState = {}) {
  const [state, setState] = useState(initialState);
  const [isRestored, setIsRestored] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Restore state on mount
  useEffect(() => {
    if (!formId || !jobId) return;

    const restoreState = async () => {
      try {
        const savedState = await fieldPersistence.loadFormState(formId, jobId);
        if (savedState) {
          setState(savedState);
        }
        setIsRestored(true);
      } catch (error) {
        console.error('Failed to restore state:', error);
        setIsRestored(true);
      }
    };

    restoreState();
  }, [formId, jobId]);

  // Auto-save on state change (debounced)
  useEffect(() => {
    if (!isRestored || !formId || !jobId) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      fieldPersistence.saveFormState(formId, jobId, state).catch(console.error);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, formId, jobId, isRestored]);

  // Persist on visibility change (app background)
  useEffect(() => {
    if (!formId || !jobId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        fieldPersistence.saveFormState(formId, jobId, state).catch(console.error);
      }
    };

    const handleFreeze = () => {
      fieldPersistence.saveFormState(formId, jobId, state).catch(console.error);
    };

    const handleBlur = () => {
      fieldPersistence.saveFormState(formId, jobId, state).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('freeze', handleFreeze);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('freeze', handleFreeze);
      window.removeEventListener('blur', handleBlur);
    };
  }, [formId, jobId, state]);

  // Clear state (on explicit save/cancel)
  const clearState = useCallback(async () => {
    if (!formId || !jobId) return;
    
    try {
      await fieldPersistence.clearFormState(formId, jobId);
      setState(initialState);
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  }, [formId, jobId, initialState]);

  return [state, setState, clearState, isRestored];
}

/**
 * Hook for persistent draft text (notes, descriptions, etc.)
 */
export function useFieldDraft(draftType, jobId, initialValue = '') {
  const [value, setValue] = useState(initialValue);
  const [isRestored, setIsRestored] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Restore draft on mount
  useEffect(() => {
    if (!draftType || !jobId) return;

    const restoreDraft = async () => {
      try {
        const savedDraft = await fieldPersistence.loadDraft(draftType, jobId);
        if (savedDraft && savedDraft.text) {
          setValue(savedDraft.text);
        }
        setIsRestored(true);
      } catch (error) {
        console.error('Failed to restore draft:', error);
        setIsRestored(true);
      }
    };

    restoreDraft();
  }, [draftType, jobId]);

  // Auto-save on value change (debounced)
  useEffect(() => {
    if (!isRestored || !draftType || !jobId) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save after 500ms of inactivity (faster for text)
    saveTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        fieldPersistence.saveDraft(draftType, jobId, { text: value }).catch(console.error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [value, draftType, jobId, isRestored]);

  // Persist on visibility change
  useEffect(() => {
    if (!draftType || !jobId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && value.trim()) {
        fieldPersistence.saveDraft(draftType, jobId, { text: value }).catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [draftType, jobId, value]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!draftType || !jobId) return;
    
    try {
      await fieldPersistence.clearDraft(draftType, jobId);
      setValue(initialValue);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [draftType, jobId, initialValue]);

  return [value, setValue, clearDraft, isRestored];
}

/**
 * Hook for saving scroll positions
 */
export function useFieldScroll(viewId) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!viewId) return;

    // Restore scroll on mount
    const restoreScroll = async () => {
      try {
        const position = await fieldPersistence.loadScrollPosition(viewId);
        if (scrollRef.current && position > 0) {
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = position;
            }
          });
        }
      } catch (error) {
        console.error('Failed to restore scroll:', error);
      }
    };

    restoreScroll();

    // Save scroll on scroll
    const handleScroll = () => {
      if (scrollRef.current) {
        fieldPersistence.saveScrollPosition(viewId, scrollRef.current.scrollTop).catch(console.error);
      }
    };

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [viewId]);

  return scrollRef;
}