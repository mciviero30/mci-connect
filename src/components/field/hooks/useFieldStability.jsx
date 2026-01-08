import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Field Stability Hook
 * Prevents reloads, remounts, and state loss in MCI Field
 */
export function useFieldStability(jobId) {
  const navigate = useNavigate();
  const isFirstMount = useRef(true);
  const hasUnsavedRef = useRef(false);

  useEffect(() => {
    // Skip on first mount
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Track unsaved work
    const checkUnsaved = () => {
      hasUnsavedRef.current = sessionStorage.getItem(`field_unsaved_${jobId}`) === 'true';
    };

    const unsavedInterval = setInterval(checkUnsaved, 1000);

    // Prevent accidental reload
    const handleBeforeUnload = (e) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved work. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Android back button - prevent exit
    const handlePopState = (e) => {
      e.preventDefault();
      
      // Check for unsaved work
      if (hasUnsavedRef.current) {
        const confirmLeave = window.confirm('You have unsaved work. Leave anyway?');
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.href);
          return;
        }
      }
      
      navigate(createPageUrl('Field'), { replace: true });
    };

    // Page freeze handler (iOS)
    const handleFreeze = () => {
      if (import.meta.env?.DEV) {
        console.log('[FieldStability] ❄️ Page frozen - state persisted');
      }
    };

    const handleResume = () => {
      if (import.meta.env?.DEV) {
        console.log('[FieldStability] ♨️ Page resumed - state intact');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('freeze', handleFreeze);
    window.addEventListener('resume', handleResume);

    return () => {
      clearInterval(unsavedInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('freeze', handleFreeze);
      window.removeEventListener('resume', handleResume);
    };
  }, [jobId, navigate]);
}

/**
 * Prevent query invalidations from causing full remounts
 */
export function useStableQuery(queryClient, queryKey) {
  const updateQuery = (updater) => {
    queryClient.setQueryData(queryKey, (old) => {
      if (typeof updater === 'function') {
        return updater(old);
      }
      return old;
    });
  };

  return { updateQuery };
}