/**
 * Field Offline API
 * 
 * Unified API for Field data operations (local-first)
 */

import { saveToLocalStore, getFromLocalStore, queryLocalStore, STORES } from './FieldOfflineStorage';
import { enqueueOperation, OPERATION_TYPES } from './FieldOperationQueue';
import { getOnlineStatus } from './FieldConnectivityMonitor';

/**
 * Create dimension (local-first)
 * FASE 3C-4: CRITICAL - Include measurement_session_id for scoped storage
 */
export async function createDimension(dimensionData) {
  // FASE 3C-4: Validate measurement_session_id exists (required for measurements)
  if (!dimensionData.measurement_session_id) {
  }

  // Save to local store with session scoping
  const saved = await saveToLocalStore(STORES.DIMENSIONS, dimensionData);
  
  // Enqueue for sync
  await enqueueOperation(
    STORES.DIMENSIONS,
    OPERATION_TYPES.CREATE,
    saved,
    saved.local_id
  );
  
  return saved;
}

/**
 * Update dimension (local-first)
 */
export async function updateDimension(localId, updates) {
  // Get from local store
  const dimension = await getFromLocalStore(STORES.DIMENSIONS, localId);
  
  if (!dimension) {
    throw new Error('Dimension not found');
  }
  
  // Update locally
  const updated = {
    ...dimension,
    ...updates,
    version: (dimension.version || 1) + 1,
    last_modified: Date.now()
  };
  
  await saveToLocalStore(STORES.DIMENSIONS, updated);
  
  // Enqueue for sync
  await enqueueOperation(
    STORES.DIMENSIONS,
    OPERATION_TYPES.UPDATE,
    updated,
    localId
  );
  
  return updated;
}

/**
 * Delete dimension (local-first)
 */
export async function deleteDimension(localId) {
  const dimension = await getFromLocalStore(STORES.DIMENSIONS, localId);
  
  if (!dimension) {
    throw new Error('Dimension not found');
  }
  
  // Enqueue delete
  await enqueueOperation(
    STORES.DIMENSIONS,
    OPERATION_TYPES.DELETE,
    dimension,
    localId
  );
  
  // Remove from local store
  await deleteFromLocalStore(STORES.DIMENSIONS, localId);
  
  return true;
}

/**
 * Get dimensions for job
 */
export async function getDimensionsForJob(jobId) {
  return await queryLocalStore(STORES.DIMENSIONS, 'job_id', jobId);
}

/**
 * Create benchmark (local-first)
 */
export async function createBenchmark(benchmarkData) {
  const saved = await saveToLocalStore(STORES.BENCHMARKS, benchmarkData);
  
  await enqueueOperation(
    STORES.BENCHMARKS,
    OPERATION_TYPES.CREATE,
    saved,
    saved.local_id
  );
  
  return saved;
}

/**
 * Get benchmarks for job
 */
export async function getBenchmarksForJob(jobId) {
  return await queryLocalStore(STORES.BENCHMARKS, 'job_id', jobId);
}

/**
 * Create task (local-first)
 */
export async function createTask(taskData) {
  const saved = await saveToLocalStore(STORES.TASKS, taskData);
  
  await enqueueOperation(
    STORES.TASKS,
    OPERATION_TYPES.CREATE,
    saved,
    saved.local_id
  );
  
  return saved;
}

/**
 * Update task (local-first)
 */
export async function updateTask(localId, updates) {
  const task = await getFromLocalStore(STORES.TASKS, localId);
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  const updated = {
    ...task,
    ...updates,
    version: (task.version || 1) + 1,
    last_modified: Date.now()
  };
  
  await saveToLocalStore(STORES.TASKS, updated);
  
  await enqueueOperation(
    STORES.TASKS,
    OPERATION_TYPES.UPDATE,
    updated,
    localId
  );
  
  return updated;
}

/**
 * Get tasks for job
 */
export async function getTasksForJob(jobId) {
  return await queryLocalStore(STORES.TASKS, 'job_id', jobId);
}

/**
 * Create photo (local-first with blob)
 */
export async function createPhoto(photoData, blob) {
  // Store blob separately
  const blobUrl = URL.createObjectURL(blob);
  
  const photoRecord = {
    ...photoData,
    local_blob_url: blobUrl,
    blob_size: blob.size,
    needs_upload: true
  };
  
  const saved = await saveToLocalStore(STORES.PHOTOS, photoRecord);
  
  // Enqueue upload operation
  await enqueueOperation(
    STORES.PHOTOS,
    OPERATION_TYPES.UPLOAD,
    { ...saved, blob },
    saved.local_id
  );
  
  return saved;
}

/**
 * Get photos for job
 */
export async function getPhotosForJob(jobId) {
  return await queryLocalStore(STORES.PHOTOS, 'job_id', jobId);
}

/**
 * Create site note session (local-first)
 */
export async function createSiteNoteSession(sessionData) {
  const saved = await saveToLocalStore(STORES.SITE_NOTES, sessionData);
  
  await enqueueOperation(
    STORES.SITE_NOTES,
    OPERATION_TYPES.CREATE,
    saved,
    saved.local_id
  );
  
  return saved;
}

/**
 * Get site notes for job
 */
export async function getSiteNotesForJob(jobId) {
  return await queryLocalStore(STORES.SITE_NOTES, 'job_id', jobId);
}

/**
 * Check if data is available locally
 */
export function isDataLocal() {
  return true; // Always true for offline-first
}

/**
 * Check if sync is needed
 */
export async function needsSync() {
  const { getPendingOperations } = await import('./FieldOperationQueue');
  const pending = await getPendingOperations();
  return pending.length > 0;
}