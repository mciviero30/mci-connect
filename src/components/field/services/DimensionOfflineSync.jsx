/**
 * Dimension Offline Sync Service
 * Handles offline storage and sync for field dimensions
 */

const DB_NAME = 'mci_field_dimensions';
const DB_VERSION = 1;
const DIMENSION_STORE = 'dimensions';
const SYNC_QUEUE_STORE = 'sync_queue';

/**
 * Initialize IndexedDB for dimension storage
 */
export async function initDimensionDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Dimensions store
      if (!db.objectStoreNames.contains(DIMENSION_STORE)) {
        const dimensionStore = db.createObjectStore(DIMENSION_STORE, { keyPath: 'local_id' });
        dimensionStore.createIndex('job_id', 'job_id', { unique: false });
        dimensionStore.createIndex('synced', 'offline_synced', { unique: false });
        dimensionStore.createIndex('created_at', 'created_at', { unique: false });
      }
      
      // Sync queue store
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const queueStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save dimension locally (offline-first)
 */
export async function saveDimensionLocally(dimension) {
  const db = await initDimensionDB();
  
  // Generate local ID if not exists
  if (!dimension.local_id) {
    dimension.local_id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  dimension.created_at = dimension.created_at || new Date().toISOString();
  dimension.offline_synced = false;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DIMENSION_STORE], 'readwrite');
    const store = transaction.objectStore(DIMENSION_STORE);
    const request = store.put(dimension);
    
    request.onsuccess = () => resolve(dimension);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all local dimensions for a job
 */
export async function getLocalDimensions(jobId) {
  const db = await initDimensionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DIMENSION_STORE], 'readonly');
    const store = transaction.objectStore(DIMENSION_STORE);
    const index = store.index('job_id');
    const request = index.getAll(jobId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get unsynced dimensions
 */
export async function getUnsyncedDimensions() {
  const db = await initDimensionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DIMENSION_STORE], 'readonly');
    const store = transaction.objectStore(DIMENSION_STORE);
    const index = store.index('synced');
    const request = index.getAll(false);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark dimension as synced
 */
export async function markDimensionSynced(localId, serverId) {
  const db = await initDimensionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DIMENSION_STORE], 'readwrite');
    const store = transaction.objectStore(DIMENSION_STORE);
    const getRequest = store.get(localId);
    
    getRequest.onsuccess = () => {
      const dimension = getRequest.result;
      if (dimension) {
        dimension.offline_synced = true;
        dimension.server_id = serverId;
        dimension.synced_at = new Date().toISOString();
        
        const putRequest = store.put(dimension);
        putRequest.onsuccess = () => resolve(dimension);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Dimension not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Queue dimension for sync
 */
export async function queueDimensionSync(dimension) {
  const db = await initDimensionDB();
  
  const queueItem = {
    dimension,
    timestamp: Date.now(),
    retries: 0
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.add(queueItem);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Process sync queue
 */
export async function processSyncQueue(syncFunction) {
  const db = await initDimensionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const queue = request.result;
      const results = [];
      
      for (const item of queue) {
        try {
          const result = await syncFunction(item.dimension);
          
          // Mark as synced
          await markDimensionSynced(item.dimension.local_id, result.id);
          
          // Remove from queue
          store.delete(item.id);
          
          results.push({ success: true, item });
        } catch (error) {
          // Increment retry count
          item.retries++;
          
          if (item.retries >= 3) {
            // Max retries reached, keep in queue but flag
            item.failed = true;
          }
          
          store.put(item);
          results.push({ success: false, item, error });
        }
      }
      
      resolve(results);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all local dimension data (admin only)
 */
export async function clearLocalDimensions(jobId) {
  const db = await initDimensionDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DIMENSION_STORE], 'readwrite');
    const store = transaction.objectStore(DIMENSION_STORE);
    const index = store.index('job_id');
    const request = index.openCursor(jobId);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get sync statistics
 */
export async function getSyncStats(jobId) {
  const dimensions = await getLocalDimensions(jobId);
  const queue = await getUnsyncedDimensions();
  
  return {
    total: dimensions.length,
    synced: dimensions.filter(d => d.offline_synced).length,
    pending: queue.length,
    lastSync: dimensions
      .filter(d => d.synced_at)
      .sort((a, b) => new Date(b.synced_at) - new Date(a.synced_at))[0]?.synced_at || null
  };
}