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
 */
export async function enqueueOperation(entityType, operationType, entityData, localId) {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    
    const operation = {
      entity_type: entityType,
      operation_type: operationType,
      entity_data: entityData,
      local_id: localId,
      status: 'pending',
      timestamp: Date.now(),
      retry_count: 0,
      error_message: null
    };
    
    const request = store.add(operation);
    
    request.onsuccess = () => {
      const operationId = request.result;
      resolve({ ...operation, operation_id: operationId });
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending operations
 */
export async function getPendingOperations() {
  const db = await initQueue();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
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
 * Mark operation as failed
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
        operation.status = 'failed';
        operation.error_message = errorMessage;
        operation.retry_count += 1;
        operation.failed_at = Date.now();
        
        // Retry logic: mark as pending if retry count < 3
        if (operation.retry_count < 3) {
          operation.status = 'pending';
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