const DB_NAME = 'mci_field_storage';
const DB_VERSION = 2;

// IndexedDB Schema
const STORES = {
  tasks: { keyPath: 'id', indexes: ['job_id', 'status', 'synced', 'created_at'] },
  incidents: { keyPath: 'id', indexes: ['job_id', 'severity', 'synced', 'incident_date'] },
  photos: { keyPath: 'id', indexes: ['job_id', 'synced', 'uploaded_at'] },
  progress: { keyPath: 'id', indexes: ['job_id', 'synced', 'timestamp'] },
  notes: { keyPath: 'id', indexes: ['job_id', 'synced', 'created_at'] },
  sync_queue: { keyPath: 'id', autoIncrement: true, indexes: ['entity_type', 'job_id', 'timestamp'] }
};

class FieldStorageService {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create/update stores
        Object.entries(STORES).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { 
              keyPath: config.keyPath, 
              autoIncrement: config.autoIncrement 
            });

            // Create indexes
            config.indexes?.forEach(indexName => {
              store.createIndex(indexName, indexName, { unique: false });
            });
          }
        });
      };
    });
  }

  async ensureDB() {
    if (!this.db) await this.init();
    return this.db;
  }

  // Generic CRUD operations
  async save(storeName, data) {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    const record = {
      ...data,
      id: data.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: false,
      created_at: data.created_at || new Date().toISOString()
    };

    await store.put(record);
    
    // Add to sync queue
    await this.addToSyncQueue(storeName, record.id, record.job_id, 'save');
    
    return record;
  }

  async getByJobId(storeName, jobId) {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('job_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(jobId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, id, updates) {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = async () => {
        const record = getRequest.result;
        if (!record) return reject(new Error('Record not found'));

        const updated = { ...record, ...updates, synced: false, updated_at: new Date().toISOString() };
        const putRequest = store.put(updated);
        
        putRequest.onsuccess = async () => {
          await this.addToSyncQueue(storeName, id, record.job_id, 'update');
          resolve(updated);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async delete(storeName, id) {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(storeName, id) {
    const db = await this.ensureDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) return reject(new Error('Record not found'));

        record.synced = true;
        record.synced_at = new Date().toISOString();
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(record);
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Sync Queue Management
  async addToSyncQueue(entityType, entityId, jobId, operation) {
    const db = await this.ensureDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');

    await store.add({
      entity_type: entityType,
      entity_id: entityId,
      job_id: jobId,
      operation,
      timestamp: Date.now(),
      retries: 0
    });
  }

  async getSyncQueue(jobId = null) {
    const db = await this.ensureDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');

    return new Promise((resolve, reject) => {
      if (jobId) {
        const index = store.index('job_id');
        const request = index.getAll(jobId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async removeSyncQueueItem(id) {
    const db = await this.ensureDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    await store.delete(id);
  }

  // Photo-specific: store blob data
  async savePhotoBlob(photoId, blob) {
    const db = await this.ensureDB();
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(photoId);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) return reject(new Error('Photo record not found'));

        record.blob = blob;
        const putRequest = store.put(record);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Cleanup: Remove synced records older than 7 days
  async cleanup(jobId = null) {
    const db = await this.ensureDB();
    const cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const storeName of Object.keys(STORES)) {
      if (storeName === 'sync_queue') continue;

      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = jobId ? store.index('job_id') : null;

      const records = await new Promise((resolve) => {
        const request = jobId ? index.getAll(jobId) : store.getAll();
        request.onsuccess = () => resolve(request.result);
      });

      for (const record of records) {
        if (record.synced && new Date(record.synced_at).getTime() < cutoffDate) {
          await store.delete(record.id);
        }
      }
    }
  }

  // Get unsynced count for status bar
  async getUnsyncedCount(jobId = null) {
    const queue = await this.getSyncQueue(jobId);
    return queue.length;
  }

  // Clear all data for a job (when job is deleted)
  async clearJobData(jobId) {
    const db = await this.ensureDB();
    
    for (const storeName of Object.keys(STORES)) {
      if (storeName === 'sync_queue') continue;

      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('job_id');

      const records = await new Promise((resolve) => {
        const request = index.getAll(jobId);
        request.onsuccess = () => resolve(request.result);
      });

      for (const record of records) {
        await store.delete(record.id);
      }
    }
  }
}

export const fieldStorage = new FieldStorageService();

// Auto-initialize
if (typeof window !== 'undefined') {
  fieldStorage.init().catch(console.error);
}