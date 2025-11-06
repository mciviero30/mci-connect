/**
 * Prompt #85: IndexedDB Wrapper for Offline Support
 * Provides a robust interface for storing data locally
 */

const DB_NAME = 'MCIConnectOfflineDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  MUTATIONS: 'mutations',
  CACHED_DATA: 'cached_data',
  SYNC_LOG: 'sync_log'
};

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('✅ IndexedDB initialized successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Mutations store - for queued operations
      if (!db.objectStoreNames.contains(STORES.MUTATIONS)) {
        const mutationStore = db.createObjectStore(STORES.MUTATIONS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
        mutationStore.createIndex('entityType', 'entityType', { unique: false });
        mutationStore.createIndex('status', 'status', { unique: false });
        console.log('Created mutations store');
      }

      // Cached data store - for offline reads
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_DATA, { 
          keyPath: 'key' 
        });
        cacheStore.createIndex('entityType', 'entityType', { unique: false });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Created cached_data store');
      }

      // Sync log store - for tracking sync history
      if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const syncStore = db.createObjectStore(STORES.SYNC_LOG, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('success', 'success', { unique: false });
        console.log('Created sync_log store');
      }
    };
  });
};

/**
 * Get database instance
 */
const getDB = async () => {
  return await initDB();
};

/**
 * Add item to store
 */
export const addItem = async (storeName, item) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get item by key
 */
export const getItem = async (storeName, key) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all items from store
 */
export const getAllItems = async (storeName) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Update item in store
 */
export const updateItem = async (storeName, item) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete item from store
 */
export const deleteItem = async (storeName, key) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clear entire store
 */
export const clearStore = async (storeName) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get items by index
 */
export const getItemsByIndex = async (storeName, indexName, value) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Count items in store
 */
export const countItems = async (storeName) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};