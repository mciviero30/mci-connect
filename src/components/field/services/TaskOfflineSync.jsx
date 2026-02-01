/**
 * TaskOfflineSync.js
 * Offline-first task creation queue with deterministic sync behavior
 * SSOT: IndexedDB stores pending tasks until sync confirmation
 */

import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'FieldTasksOfflineDB';
const STORE_NAME = 'pendingTasks';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

class TaskOfflineSync {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = [];
    
    // Setup
    this.initDB();
    this.monitorConnectivity();
  }

  /**
   * Initialize IndexedDB for offline queue
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'temp_id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  /**
   * Monitor connectivity changes
   */
  monitorConnectivity() {
    window.addEventListener('online', () => {
      console.log('🌐 Network restored - starting task sync');
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      console.log('📵 Network lost - queuing tasks offline');
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Create a new task (offline-safe)
   * @returns {{ temp_id, status, ...taskData }}
   */
  async createTask(taskData) {
    const temp_id = uuidv4();
    const queuedTask = {
      temp_id,
      ...taskData,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'pending' // Not yet synced
    };

    // Always save to queue first (zero-loss guarantee)
    await this.saveToQueue(queuedTask);
    
    // If online, start sync immediately
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return queuedTask;
  }

  /**
   * Save task to IndexedDB queue
   */
  async saveToQueue(task) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(task);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✅ Task ${task.temp_id} saved to queue`);
        this.notifyListeners();
        resolve();
      };
    });
  }

  /**
   * Get all pending tasks from queue
   */
  async getPendingTasks() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const range = IDBKeyRange.only('pending');
      const request = index.getAll(range);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get all queued tasks (for display)
   */
  async getQueuedTasks() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Process sync queue FIFO
   */
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    const pendingTasks = await this.getPendingTasks();
    
    for (const task of pendingTasks) {
      try {
        await this.syncTask(task);
      } catch (error) {
        console.error(`❌ Sync failed for task ${task.temp_id}:`, error);
        // Continue with next task (don't break)
      }
    }
    
    this.syncInProgress = false;
    this.notifyListeners();
  }

  /**
   * Sync single task with retry logic
   */
  async syncTask(task) {
    try {
      // Step 1: Validate payload
      if (!this.validateTask(task)) {
        throw new Error('Invalid task payload');
      }

      // Step 2: Mark as syncing
      await this.updateTaskStatus(task.temp_id, 'syncing');
      
      // Step 3: Send to backend
      const response = await this.sendToBackend(task);
      
      // Step 4: Verify server response
      if (!response || !response.id) {
        throw new Error('Invalid server response');
      }

      // Step 5: Replace temp task with server task
      await this.removeFromQueue(task.temp_id);
      
      console.log(`✨ Task ${task.temp_id} synced successfully (server ID: ${response.id})`);
      this.notifyListeners();
      
      return response;
    } catch (error) {
      await this.handleSyncError(task, error);
      throw error;
    }
  }

  /**
   * Validate task payload before sending
   */
  validateTask(task) {
    return (
      task.job_id &&
      task.title &&
      task.created_by &&
      task.assignee
    );
  }

  /**
   * Send task to backend
   */
  async sendToBackend(task) {
    try {
      // Prepare payload (remove temp_id, sync metadata)
      const payload = {
        job_id: task.job_id,
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        priority: task.priority || 'medium',
        created_by: task.created_by,
        // Add sync metadata for audit trail
        synced_from_offline: true,
        offline_created_at: task.created_at,
      };

      // Call backend to create task (assumes Task entity exists)
      // This would be replaced with actual backend call (e.g., base44.entities.Task.create)
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Backend sync error:', error);
      throw error;
    }
  }

  /**
   * Handle sync failures with retry logic
   */
  async handleSyncError(task, error) {
    const newRetryCount = (task.retry_count || 0) + 1;
    
    if (newRetryCount >= MAX_RETRIES) {
      // Permanent failure after max retries
      await this.updateTaskStatus(task.temp_id, 'failed');
      console.error(`🔴 Task ${task.temp_id} failed permanently after ${MAX_RETRIES} retries`);
    } else {
      // Schedule retry
      await this.updateRetryCount(task.temp_id, newRetryCount);
      console.warn(`⚠️ Retrying task ${task.temp_id} (attempt ${newRetryCount}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        if (this.isOnline) {
          this.processSyncQueue();
        }
      }, RETRY_DELAY_MS * newRetryCount);
    }
  }

  /**
   * Update task status in queue
   */
  async updateTaskStatus(temp_id, status) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const getRequest = store.get(temp_id);
      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          task.status = status;
          const putRequest = store.put(task);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => {
            console.log(`📝 Task ${temp_id} status → ${status}`);
            this.notifyListeners();
            resolve();
          };
        } else {
          reject(new Error('Task not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Update retry count
   */
  async updateRetryCount(temp_id, count) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const getRequest = store.get(temp_id);
      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          task.retry_count = count;
          const putRequest = store.put(task);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          reject(new Error('Task not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove task from queue (successful sync)
   */
  async removeFromQueue(temp_id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(temp_id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`🗑️ Task ${temp_id} removed from queue`);
        this.notifyListeners();
        resolve();
      };
    });
  }

  /**
   * Manual retry (user-triggered)
   */
  async retryTask(temp_id) {
    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const task = await new Promise((resolve, reject) => {
      const request = store.get(temp_id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    if (task) {
      await this.updateTaskStatus(temp_id, 'pending');
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }
  }

  /**
   * Delete task from queue (with confirmation)
   */
  async deleteTask(temp_id) {
    await this.removeFromQueue(temp_id);
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({ isOnline: this.isOnline, syncInProgress: this.syncInProgress });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    const tasks = await this.getQueuedTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      syncing: tasks.filter(t => t.status === 'syncing').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      synced: tasks.filter(t => t.status === 'synced').length,
    };
  }
}

// Singleton instance
let syncInstance = null;

export function getTaskOfflineSync() {
  if (!syncInstance) {
    syncInstance = new TaskOfflineSync();
  }
  return syncInstance;
}

export default TaskOfflineSync;