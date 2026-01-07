import { fieldStorage } from './FieldStorageService';
import { base44 } from '@/api/base44Client';

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

class SyncQueueService {
  constructor() {
    this.isProcessing = false;
    this.processingId = null;
  }

  async init() {
    // Resume queue on page load
    await this.resumeQueue();

    // Resume on reconnect
    window.addEventListener('online', () => this.resumeQueue());

    // Resume periodically (in case of missed events)
    setInterval(() => this.resumeQueue(), 30000); // Every 30s
  }

  async enqueue(entityType, entityId, jobId, operation, data) {
    await fieldStorage.addToSyncQueue(entityType, entityId, jobId, operation, data);
    this.processQueue(); // Trigger immediate processing
  }

  async resumeQueue() {
    if (!navigator.onLine) return;
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      const queue = await fieldStorage.getSyncQueue();
      
      // Sort by timestamp (FIFO)
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const item of sortedQueue) {
        if (!navigator.onLine) break;

        try {
          await this.processItem(item);
        } catch (error) {
          await this.handleFailure(item, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async processItem(item) {
    const { entity_type, entity_id, job_id, operation, retries = 0 } = item;

    // Get the actual data from storage
    const data = await fieldStorage.db.transaction(entity_type, 'readonly')
      .objectStore(entity_type).get(entity_id);

    if (!data) {
      // Data deleted locally, remove from queue
      await fieldStorage.removeSyncQueueItem(item.id);
      return;
    }

    const entityMap = {
      tasks: 'Task',
      incidents: 'SafetyIncident',
      photos: 'Photo',
      progress: 'ProjectMilestone',
      notes: 'ChatMessage'
    };

    const entityName = entityMap[entity_type];
    if (!entityName) throw new Error(`Unknown entity type: ${entity_type}`);

    let result;
    if (operation === 'save') {
      // Remove local-only fields
      const { id, synced, created_at, updated_at, blob, _pending, ...cleanData } = data;
      result = await base44.entities[entityName].create(cleanData);
    } else if (operation === 'update') {
      const { synced, blob, _pending, ...cleanData } = data;
      result = await base44.entities[entityName].update(entity_id, cleanData);
    }

    // Mark as synced
    await fieldStorage.markSynced(entity_type, entity_id);
    await fieldStorage.removeSyncQueueItem(item.id);

    console.log(`✅ Synced ${entity_type}/${entity_id}`);
  }

  async handleFailure(item, error) {
    const retries = (item.retries || 0) + 1;

    if (retries >= MAX_RETRIES) {
      console.error(`❌ Failed to sync after ${MAX_RETRIES} retries:`, item, error);
      
      // Mark as failed but keep in queue for manual retry
      const db = await fieldStorage.ensureDB();
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      
      await store.put({
        ...item,
        retries,
        failed: true,
        last_error: error.message,
        last_attempt: Date.now()
      });
      
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = BASE_DELAY * Math.pow(2, retries);

    console.log(`⚠️ Sync failed, retry ${retries}/${MAX_RETRIES} in ${delay}ms:`, error.message);

    // Update retry count
    const db = await fieldStorage.ensureDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    
    await store.put({
      ...item,
      retries,
      last_error: error.message,
      last_attempt: Date.now(),
      next_retry: Date.now() + delay
    });

    // Schedule retry
    setTimeout(() => this.processQueue(), delay);
  }

  async getQueueStatus() {
    const queue = await fieldStorage.getSyncQueue();
    return {
      total: queue.length,
      pending: queue.filter(i => !i.failed).length,
      failed: queue.filter(i => i.failed).length
    };
  }

  async clearFailed() {
    const queue = await fieldStorage.getSyncQueue();
    const failed = queue.filter(i => i.failed);
    
    for (const item of failed) {
      await fieldStorage.removeSyncQueueItem(item.id);
    }
  }

  async retryFailed() {
    const db = await fieldStorage.ensureDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    
    const queue = await fieldStorage.getSyncQueue();
    const failed = queue.filter(i => i.failed);
    
    for (const item of failed) {
      await store.put({
        ...item,
        failed: false,
        retries: 0,
        last_error: null
      });
    }

    this.processQueue();
  }
}

export const syncQueue = new SyncQueueService();

// Auto-initialize on load and login
if (typeof window !== 'undefined') {
  // Initialize immediately
  syncQueue.init().catch(console.error);

  // Resume after user authentication
  const originalAuthMe = base44.auth.me;
  base44.auth.me = async function(...args) {
    const result = await originalAuthMe.apply(this, args);
    setTimeout(() => syncQueue.resumeQueue(), 1000);
    return result;
  };
}