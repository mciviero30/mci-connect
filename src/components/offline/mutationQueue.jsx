/**
 * Prompt #85: Mutation Queue with Retry Logic
 * Handles offline operations and syncs when connection restored
 */

import { base44 } from '@/api/base44Client';
import { addItem, getAllItems, updateItem, deleteItem, getItemsByIndex, STORES } from './indexedDBWrapper';

// Mutation types
export const MUTATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

// Entity types that support offline
export const OFFLINE_ENTITIES = {
  TIME_ENTRY: 'TimeEntry',
  EXPENSE: 'Expense',
  JOB: 'Job',
  DRIVING_LOG: 'DrivingLog'
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds
const BACKOFF_MULTIPLIER = 2; // Exponential backoff

/**
 * Add mutation to queue
 */
export const queueMutation = async (entityType, mutationType, data, tempId = null) => {
  const mutation = {
    entityType,
    mutationType,
    data,
    tempId, // Temporary ID for optimistic updates
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    error: null
  };

  try {
    const id = await addItem(STORES.MUTATIONS, mutation);
    return { ...mutation, id };
  } catch (error) {
    console.error('❌ Failed to queue mutation:', error);
    throw error;
  }
};

/**
 * Get all pending mutations
 */
export const getPendingMutations = async () => {
  try {
    return await getItemsByIndex(STORES.MUTATIONS, 'status', 'pending');
  } catch (error) {
    console.error('❌ Failed to get pending mutations:', error);
    return [];
  }
};

/**
 * Get pending mutations count
 */
export const getPendingCount = async () => {
  const pending = await getPendingMutations();
  return pending.length;
};

/**
 * Execute a single mutation
 */
const executeMutation = async (mutation) => {
  const { entityType, mutationType, data } = mutation;

  try {
    let result;

    switch (mutationType) {
      case MUTATION_TYPES.CREATE:
        result = await base44.entities[entityType].create(data);
        break;

      case MUTATION_TYPES.UPDATE:
        result = await base44.entities[entityType].update(data.id, data);
        break;

      case MUTATION_TYPES.DELETE:
        await base44.entities[entityType].delete(data.id);
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown mutation type: ${mutationType}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Failed to execute ${mutationType} on ${entityType}:`, error);
    throw error;
  }
};

/**
 * Process mutation with retry logic
 */
const processMutation = async (mutation) => {
  const maxRetries = MAX_RETRIES;
  let retryCount = mutation.retryCount || 0;

  while (retryCount <= maxRetries) {
    try {
      // Execute the mutation
      const result = await executeMutation(mutation);

      // Mark as completed
      await updateItem(STORES.MUTATIONS, {
        ...mutation,
        status: 'completed',
        completedAt: Date.now(),
        result
      });

      // Log success
      await addItem(STORES.SYNC_LOG, {
        mutationId: mutation.id,
        entityType: mutation.entityType,
        mutationType: mutation.mutationType,
        timestamp: Date.now(),
        success: true,
        retryCount
      });

      return { success: true, result };

    } catch (error) {
      retryCount++;

      if (retryCount > maxRetries) {
        // Max retries reached, mark as failed
        await updateItem(STORES.MUTATIONS, {
          ...mutation,
          status: 'failed',
          retryCount,
          error: error.message,
          failedAt: Date.now()
        });

        // Log failure
        await addItem(STORES.SYNC_LOG, {
          mutationId: mutation.id,
          entityType: mutation.entityType,
          mutationType: mutation.mutationType,
          timestamp: Date.now(),
          success: false,
          error: error.message,
          retryCount
        });

        console.error(`❌ Mutation ${mutation.id} failed after ${maxRetries} retries:`, error);
        return { success: false, error };
      }

      // Calculate backoff delay
      const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount - 1);

      // Update retry count
      await updateItem(STORES.MUTATIONS, {
        ...mutation,
        retryCount,
        lastRetryAt: Date.now()
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Sync all pending mutations
 */
export const syncMutations = async (onProgress = null) => {
  const pendingMutations = await getPendingMutations();

  if (pendingMutations.length === 0) {
    return { synced: 0, failed: 0 };
  }


  let synced = 0;
  let failed = 0;

  for (let i = 0; i < pendingMutations.length; i++) {
    const mutation = pendingMutations[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: pendingMutations.length,
        mutation
      });
    }

    const result = await processMutation(mutation);

    if (result.success) {
      synced++;
      // Delete completed mutation
      await deleteItem(STORES.MUTATIONS, mutation.id);
    } else {
      failed++;
    }
  }

  return { synced, failed };
};

/**
 * Clear failed mutations
 */
export const clearFailedMutations = async () => {
  const allMutations = await getAllItems(STORES.MUTATIONS);
  const failedMutations = allMutations.filter(m => m.status === 'failed');

  for (const mutation of failedMutations) {
    await deleteItem(STORES.MUTATIONS, mutation.id);
  }

  return failedMutations.length;
};

/**
 * Retry failed mutations
 */
export const retryFailedMutations = async () => {
  const allMutations = await getAllItems(STORES.MUTATIONS);
  const failedMutations = allMutations.filter(m => m.status === 'failed');


  for (const mutation of failedMutations) {
    // Reset status and retry count
    await updateItem(STORES.MUTATIONS, {
      ...mutation,
      status: 'pending',
      retryCount: 0,
      error: null
    });
  }

  // Sync all pending (including retried)
  return await syncMutations();
};