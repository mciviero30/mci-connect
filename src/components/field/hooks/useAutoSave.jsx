import { useState, useEffect, useCallback, useRef } from 'react';
import { fieldStorage } from '../services/FieldStorageService';
import { base44 } from '@/api/base44Client';
import { useFieldContext, withFieldContext } from '../FieldContextProvider';
import { mobileLifecycle } from '../services/MobileLifecycleManager';

/**
 * DEPRECATED: Use useZeroDataLoss instead
 * This hook remains for backward compatibility
 * 
 * useAutoSave → useZeroDataLoss migration recommended
 */
export function useAutoSave({ 
  entityType, 
  jobId, 
  enabled = true,
  debounceMs = 2000 
}) {
  const fieldContext = useFieldContext();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const timeoutRef = useRef(null);
  const isOnline = navigator.onLine;

  // Create draft on first input
  const createDraft = useCallback(async (data) => {
    if (!enabled || !jobId) return null;
    
    const id = `draft_${Date.now()}`;
    const draft = withFieldContext({ ...data, id }, fieldContext, entityType);
    
    await fieldStorage.save(entityType, draft);
    setDraftId(id);
    return id;
  }, [entityType, jobId, enabled, fieldContext]);

  // Auto-save with debounce
  const autoSave = useCallback(async (data) => {
    if (!enabled || !data || !jobId) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce save
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        let id = draftId;
        const enrichedData = withFieldContext(data, fieldContext, entityType);
        
        // Create draft if doesn't exist
        if (!id) {
          id = await createDraft(enrichedData);
        } else {
          // Update existing draft
          await fieldStorage.update(entityType, id, enrichedData);
        }
        
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);
  }, [enabled, jobId, draftId, entityType, debounceMs, createDraft, fieldContext]);

  // Load existing draft
  const loadDraft = useCallback(async () => {
    if (!enabled || !jobId) return null;
    
    try {
      const drafts = await fieldStorage.getByJobId(entityType, jobId);
      const draft = drafts.find(d => d.id?.startsWith('draft_') && !d.synced);
      if (draft) {
        setDraftId(draft.id);
        return draft;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, [entityType, jobId, enabled]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (draftId) {
      try {
        await fieldStorage.delete(entityType, draftId);
        setDraftId(null);
        setLastSaved(null);
      } catch (error) {
        console.error('Failed to clear draft:', error);
      }
    }
  }, [draftId, entityType]);

  // ENHANCED: Save immediately on background
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = mobileLifecycle.on('background', async () => {
      // Force flush pending save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        
        // Save immediately
        if (draftId) {
          try {
            const enrichedData = withFieldContext({}, fieldContext, entityType);
            await fieldStorage.update(entityType, draftId, enrichedData);
            
            if (import.meta.env?.DEV) {
              console.log(`[AutoSave] Background save for ${entityType}`);
            }
          } catch (error) {
            console.error('Background save failed:', error);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [enabled, draftId, entityType, fieldContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    autoSave,
    loadDraft,
    clearDraft,
    createDraft,
    isSaving,
    lastSaved,
    draftId,
    isOnline
  };
}