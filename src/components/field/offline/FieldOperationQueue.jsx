/**
 * Field Operation Queue
 * 
 * Write-ahead log for all Field operations (source of truth for sync)
 */

const QUEUE_STORE = 'operation_queue';

/**
 * Operation types
 */
export const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  UPLOAD: 'upload'
};

/**
 * Initialize operation queue
 */
async function initQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mci_field_queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'operation_id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('entity_type', 'entity_type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Enqueue operation
 * HARDENED: Idempotency key prevents duplicate creates
 */
export async function enqueueOperation(entityType, operationType, entityData, localId) {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    
    // Generate idempotency key for create operations
    const idempotencyKey = operationType === 'create' 
      ? `${entityType}_${localId}_${Date.now()}`
      : null;
    
    const operation = {
      entity_type: entityType,
      operation_type: operationType,
      entity_data: entityData,
      local_id: localId,
      idempotency_key: idempotencyKey,  // CRITICAL: Prevents duplicate creates
      sequence_number: Date.now(),      // CRITICAL: Preserves order
      status: 'pending',
      timestamp: Date.now(),
      retry_count: 0,
      error_message: null,
      checksum: generateChecksum(entityData), // CRITICAL: Validates data integrity
    };
    
    const request = store.add(operation);
    
    request.onsuccess = () => {
      const operationId = request.result;
      if (import.meta.env?.DEV) {
        console.log(`[Queue] ✅ Enqueued ${operationType} for ${entityType}`, {
          operationId,
          localId,
          idempotencyKey,
        });
      }
      resolve({ ...operation, operation_id: operationId });
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate checksum for data integrity validation
 */
function generateChecksum(data) {
  try {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  } catch (error) {
    return null;
  }
}

/**
 * Get pending operations (ordered by sequence number)
 * HARDENED: Order preserved, backoff respected
 */
export async function getPendingOperations() {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const allOps = request.result || [];
      
      // Filter: pending or pending_retry (if retry window passed)
      const now = Date.now();
      const operations = allOps.filter(op => {
        if (op.status === 'pending') return true;
        if (op.status === 'pending_retry') {
          // Check if backoff window passed
          return !op.retry_after || now >= op.retry_after;
        }
        return false;
      });
      
      // Sort by sequence_number to preserve order
      operations.sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
      
      if (import.meta.env?.DEV && operations.length > 0) {
        console.log(`[Queue] 📋 ${operations.length} operations ready to sync (ordered)`);
      }
      
      resolve(operations);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark operation as completed
 */
export async function markOperationComplete(operationId, serverId) {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(operationId);
    
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (operation) {
        operation.status = 'completed';
        operation.server_id = serverId;
        operation.completed_at = Date.now();
        
        const putRequest = store.put(operation);
        putRequest.onsuccess = () => resolve(operation);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Operation not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Mark operation as failed with exponential backoff
 * HARDENING: Prevents retry storms
 */
export async function markOperationFailed(operationId, errorMessage) {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(operationId);
    
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (operation) {
        operation.retry_count = (operation.retry_count || 0) + 1;
        operation.error_message = errorMessage;
        operation.last_retry_at = Date.now();
        
        // HARDENING: Exponential backoff - next retry after 2^n seconds
        const backoffMs = Math.min(1000 * Math.pow(2, operation.retry_count), 60000);
        operation.retry_after = Date.now() + backoffMs;
        
        // Mark as failed permanently after max retries
        if (operation.retry_count >= 5) {
          operation.status = 'failed_permanent';
          operation.failed_at = Date.now();
          
          if (import.meta.env?.DEV) {
            console.error('[Queue] ❌ Operation failed permanently after 5 retries:', {
              operationId,
              entity: operation.entity_type,
              error: errorMessage
            });
          }
        } else {
          operation.status = 'pending_retry';
          
          if (import.meta.env?.DEV) {
            console.warn(`[Queue] ⚠️ Retry ${operation.retry_count}/5 after ${backoffMs}ms:`, {
              operationId,
              entity: operation.entity_type
            });
          }
        }
        
        const putRequest = store.put(operation);
        putRequest.onsuccess = () => resolve(operation);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Operation not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get failed operations
 */
export async function getFailedOperations() {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index('status');
    const request = index.getAll('failed');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear completed operations
 */
export async function clearCompletedOperations() {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index('status');
    const request = index.openCursor('completed');
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve(true);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const operations = request.result || [];
      
      const stats = {
        total: operations.length,
        pending: operations.filter(op => op.status === 'pending').length,
        completed: operations.filter(op => op.status === 'completed').length,
        failed: operations.filter(op => op.status === 'failed').length,
        by_type: {}
      };
      
      operations.forEach(op => {
        const type = op.entity_type;
        if (!stats.by_type[type]) {
          stats.by_type[type] = { pending: 0, completed: 0, failed: 0 };
        }
        stats.by_type[type][op.status]++;
      });
      
      resolve(stats);
    };
    
    request.onerror = () => reject(request.error);
  });
}