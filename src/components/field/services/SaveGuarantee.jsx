/**
 * SaveGuarantee - Absolute data safety enforcement
 * 
 * CRITICAL: No UI continuation until data is ACTUALLY persisted
 * 
 * Principles:
 * 1. Block UI until save completes (success or failure)
 * 2. No optimistic updates without fallback
 * 3. Explicit success confirmation
 * 4. Clear error handling
 * 5. Offline queue as safety net
 * 
 * Trust Philosophy:
 * - Slight delays are acceptable
 * - Uncertainty is NOT acceptable
 * - User must know save succeeded or failed
 */

import { fieldStorage } from './FieldStorageService';
import { enqueueOperation } from '../offline/FieldOperationQueue';

export const SaveGuarantee = {
  /**
   * Guarantee save before allowing continuation
   * Returns: { success: boolean, id: string, error?: string, savedOffline?: boolean }
   */
  async guaranteeSave({ 
    entityType, 
    entityData, 
    jobId, 
    apiCall,
    draftKey,
    onProgress 
  }) {
    onProgress?.('validating');
    
    // Step 1: Validate data
    const validation = this.validateData(entityType, entityData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }
    
    onProgress?.('persisting');
    
    // Step 2: Save to local storage FIRST (safety net)
    const localId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = `${entityType}_${localId}`;
    
    await fieldStorage.saveDraft(draftKey || entityType, {
      ...entityData,
      local_id: localId,
      idempotency_key: idempotencyKey,
      saved_at: Date.now(),
    });
    
    onProgress?.('uploading');
    
    // Step 3: Attempt server save
    const isOnline = navigator.onLine;
    
    if (isOnline) {
      try {
        // BLOCKING: Wait for API call to complete
        const result = await apiCall();
        
        onProgress?.('confirming');
        
        // Step 4: Verify save succeeded
        if (!result || !result.id) {
          throw new Error('Save succeeded but no ID returned');
        }
        
        // Step 5: Clear draft (no longer needed)
        await fieldStorage.clearDraft(draftKey || entityType);
        
        onProgress?.('complete');
        
        return {
          success: true,
          id: result.id,
          savedOnline: true,
        };
        
      } catch (error) {
        console.error('[SaveGuarantee] Online save failed:', error);
        
        // Fall through to offline queue
      }
    }
    
    // Step 6: Queue for offline sync (network failed or offline)
    onProgress?.('queuing');
    
    try {
      await enqueueOperation(
        entityType,
        'create',
        {
          ...entityData,
          local_id: localId,
          job_id: jobId,
        },
        localId
      );
      
      onProgress?.('complete');
      
      return {
        success: true,
        id: localId,
        savedOffline: true,
      };
      
    } catch (error) {
      console.error('[SaveGuarantee] Offline queue failed:', error);
      
      return {
        success: false,
        error: 'Failed to save both online and offline. Data preserved in drafts.',
      };
    }
  },

  /**
   * Validate entity data before save
   */
  validateData(entityType, data) {
    switch (entityType) {
      case 'Task':
        if (!data.title || data.title.trim() === '') {
          return { valid: false, error: 'Task title is required' };
        }
        if (!data.job_id) {
          return { valid: false, error: 'Task must be linked to a job' };
        }
        break;
        
      case 'FieldDimension':
        if (!data.area || data.area.trim() === '') {
          return { valid: false, error: 'Location/area is required' };
        }
        if (!data.measurement_type) {
          return { valid: false, error: 'Measurement type is required' };
        }
        if (!data.job_id) {
          return { valid: false, error: 'Dimension must be linked to a job' };
        }
        // Validate measurement value exists
        if (data.unit_system === 'imperial') {
          if (data.value_feet === undefined && data.value_inches === undefined) {
            return { valid: false, error: 'Measurement value is required' };
          }
        } else {
          if (!data.value_mm) {
            return { valid: false, error: 'Measurement value is required' };
          }
        }
        break;
        
      case 'Photo':
        if (!data.file_url && !data.local_blob_url) {
          return { valid: false, error: 'Photo file is required' };
        }
        if (!data.job_id) {
          return { valid: false, error: 'Photo must be linked to a job' };
        }
        break;
        
      case 'SafetyIncident':
        if (!data.description || data.description.trim() === '') {
          return { valid: false, error: 'Incident description is required' };
        }
        if (!data.severity) {
          return { valid: false, error: 'Severity level is required' };
        }
        break;
    }
    
    return { valid: true };
  },

  /**
   * Wait for save to complete with timeout
   * CRITICAL: Never hang forever
   */
  async waitForSave(savePromise, timeoutMs = 30000) {
    return Promise.race([
      savePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout after 30s')), timeoutMs)
      )
    ]);
  },
};