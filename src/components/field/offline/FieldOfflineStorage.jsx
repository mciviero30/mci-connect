/**
 * Field Offline Storage
 * 
 * IndexedDB-backed storage for Field entities (source of truth while offline)
 */

const DB_NAME = 'mci_field_offline';
const DB_VERSION = 1;

// Entity stores
const STORES = {
  DIMENSIONS: 'field_dimensions',
  DIMENSION_SETS: 'dimension_sets',
  BENCHMARKS: 'benchmarks',
  TASKS: 'tasks',
  PHOTOS: 'photos',
  PLANS: 'plans',
  SITE_NOTES: 'site_note_sessions',
  INCIDENTS: 'incidents',
  METADATA: 'metadata'
};

/**
 * Initialize IndexedDB
 */
export async function initFieldOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores with indexes
      if (!db.objectStoreNames.contains(STORES.DIMENSIONS)) {
        const dimStore = db.createObjectStore(STORES.DIMENSIONS, { keyPath: 'local_id' });
        dimStore.createIndex('job_id', 'job_id', { unique: false });
        dimStore.createIndex('area', 'area', { unique: false });
        dimStore.createIndex('synced', 'synced', { unique: false });
        dimStore.createIndex('version', 'version', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.DIMENSION_SETS)) {
        const setStore = db.createObjectStore(STORES.DIMENSION_SETS, { keyPath: 'local_id' });
        setStore.createIndex('job_id', 'job_id', { unique: false });
        setStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.BENCHMARKS)) {
        const benchStore = db.createObjectStore(STORES.BENCHMARKS, { keyPath: 'local_id' });
        benchStore.createIndex('job_id', 'job_id', { unique: false });
        benchStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'local_id' });
        taskStore.createIndex('job_id', 'job_id', { unique: false });
        taskStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'local_id' });
        photoStore.createIndex('job_id', 'job_id', { unique: false });
        photoStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        const planStore = db.createObjectStore(STORES.PLANS, { keyPath: 'local_id' });
        planStore.createIndex('job_id', 'job_id', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SITE_NOTES)) {
        const noteStore = db.createObjectStore(STORES.SITE_NOTES, { keyPath: 'local_id' });
        noteStore.createIndex('job_id', 'job_id', { unique: false });
        noteStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.INCIDENTS)) {
        const incidentStore = db.createObjectStore(STORES.INCIDENTS, { keyPath: 'local_id' });
        incidentStore.createIndex('job_id', 'job_id', { unique: false });
        incidentStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Save entity to local store
 */
export async function saveToLocalStore(storeName, entity) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Add offline metadata
    const record = {
      ...entity,
      local_id: entity.local_id || generateLocalId(),
      synced: false,
      version: entity.version || 1,
      created_offline: Date.now(),
      last_modified: Date.now()
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get entity from local store
 */
export async function getFromLocalStore(storeName, localId) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(localId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query local store
 */
export async function queryLocalStore(storeName, indexName, value) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all unsynced entities
 */
export async function getUnsyncedEntities(storeName) {
  return await queryLocalStore(storeName, 'synced', false);
}

/**
 * Mark entity as synced
 */
export async function markAsSynced(storeName, localId, serverId) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(localId);
    
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.synced = true;
        record.server_id = serverId;
        record.synced_at = Date.now();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(record);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Record not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Update entity version
 */
export async function updateEntityVersion(storeName, localId, newVersion) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(localId);
    
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.version = newVersion;
        record.last_modified = Date.now();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(record);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Record not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete entity from local store
 */
export async function deleteFromLocalStore(storeName, localId) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(localId);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all data for job
 */
export async function clearJobData(jobId) {
  const db = await initFieldOfflineDB();
  const stores = Object.values(STORES).filter(s => s !== STORES.METADATA);
  
  for (const storeName of stores) {
    const entities = await queryLocalStore(storeName, 'job_id', jobId);
    
    for (const entity of entities) {
      await deleteFromLocalStore(storeName, entity.local_id);
    }
  }
}

/**
 * Get storage metadata
 */
export async function getStorageMetadata(key) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readonly');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set storage metadata
 */
export async function setStorageMetadata(key, value) {
  const db = await initFieldOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.put({ key, value, updated_at: Date.now() });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate local ID
 */
function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export { STORES };