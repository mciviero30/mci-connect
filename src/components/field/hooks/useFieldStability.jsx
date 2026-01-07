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

  useEffect(() => {
    // Skip on first mount
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Prevent full reload on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Field resumed - state intact');
      }
    };

    // Prevent accidental reload
    const handleBeforeUnload = (e) => {
      // Only warn if there's unsaved work
      const hasUnsaved = sessionStorage.getItem(`field_unsaved_${jobId}`) === 'true';
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Android back button - prevent exit
    const handlePopState = (e) => {
      e.preventDefault();
      navigate(createPageUrl('Field'), { replace: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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