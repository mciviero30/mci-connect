/**
 * MCI Field State Persistence Service
 * Zero data loss during jobsite interruptions
 */

const DB_NAME = 'mci_field_state';
const DB_VERSION = 2;
const STORES = {
  DRAFTS: 'drafts',
  MEASUREMENTS: 'measurements',
  ACTIONS: 'pending_actions',
  FORM_STATE: 'form_state',
  SCROLL: 'scroll_positions',
};

class FieldStatePersistence {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores if they don't exist
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('jobId', 'jobId', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        });
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // Save draft with auto-expiry
  async saveDraft(type, jobId, data, expiryHours = 24) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readwrite').objectStore(STORES.DRAFTS);
      
      const draft = {
        id: `${type}_${jobId}_${Date.now()}`,
        type,
        jobId,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
      };

      await store.put(draft);
      return draft.id;
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Fallback to sessionStorage
      this.fallbackSave(`draft_${type}_${jobId}`, data);
    }
  }

  // Load latest draft for type and job
  async loadDraft(type, jobId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readonly').objectStore(STORES.DRAFTS);
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const drafts = request.result
            .filter(d => d.type === type && d.expiresAt > Date.now())
            .sort((a, b) => b.timestamp - a.timestamp);
          resolve(drafts[0]?.data || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load draft:', error);
      // Fallback to sessionStorage
      return this.fallbackLoad(`draft_${type}_${jobId}`);
    }
  }

  // Clear specific draft
  async clearDraft(type, jobId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readwrite').objectStore(STORES.DRAFTS);
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      request.onsuccess = () => {
        const drafts = request.result.filter(d => d.type === type);
        drafts.forEach(draft => store.delete(draft.id));
      };
    } catch (error) {
      console.error('Failed to clear draft:', error);
      sessionStorage.removeItem(`draft_${type}_${jobId}`);
    }
  }

  // Save measurement state
  async saveMeasurement(jobId, blueprintId, measurement) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.MEASUREMENTS], 'readwrite').objectStore(STORES.MEASUREMENTS);
      
      const record = {
        id: `${jobId}_${blueprintId}_${measurement.id || Date.now()}`,
        jobId,
        blueprintId,
        measurement,
        timestamp: Date.now(),
      };

      await store.put(record);
    } catch (error) {
      console.error('Failed to save measurement:', error);
    }
  }

  // Load measurements for blueprint
  async loadMeasurements(jobId, blueprintId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.MEASUREMENTS], 'readonly').objectStore(STORES.MEASUREMENTS);
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const measurements = request.result
            .filter(m => m.blueprintId === blueprintId)
            .map(m => m.measurement);
          resolve(measurements);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load measurements:', error);
      return [];
    }
  }

  // Save pending action (for crash recovery)
  async savePendingAction(jobId, action) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.ACTIONS], 'readwrite').objectStore(STORES.ACTIONS);
      
      const record = {
        id: `action_${jobId}_${Date.now()}`,
        jobId,
        action,
        timestamp: Date.now(),
      };

      await store.put(record);
      return record.id;
    } catch (error) {
      console.error('Failed to save pending action:', error);
    }
  }

  // Get pending actions for job
  async getPendingActions(jobId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.ACTIONS], 'readonly').objectStore(STORES.ACTIONS);
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result.map(r => r.action));
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get pending actions:', error);
      return [];
    }
  }

  // Clear pending action
  async clearPendingAction(actionId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.ACTIONS], 'readwrite').objectStore(STORES.ACTIONS);
      await store.delete(actionId);
    } catch (error) {
      console.error('Failed to clear pending action:', error);
    }
  }

  // Save form state (for multi-step forms)
  async saveFormState(formId, jobId, state) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.FORM_STATE], 'readwrite').objectStore(STORES.FORM_STATE);
      
      const record = {
        id: `${formId}_${jobId}`,
        jobId,
        formId,
        state,
        timestamp: Date.now(),
      };

      await store.put(record);
    } catch (error) {
      console.error('Failed to save form state:', error);
      this.fallbackSave(`form_${formId}_${jobId}`, state);
    }
  }

  // Load form state
  async loadFormState(formId, jobId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.FORM_STATE], 'readonly').objectStore(STORES.FORM_STATE);
      const request = store.get(`${formId}_${jobId}`);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.state || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load form state:', error);
      return this.fallbackLoad(`form_${formId}_${jobId}`);
    }
  }

  // Clear form state
  async clearFormState(formId, jobId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.FORM_STATE], 'readwrite').objectStore(STORES.FORM_STATE);
      await store.delete(`${formId}_${jobId}`);
    } catch (error) {
      console.error('Failed to clear form state:', error);
      sessionStorage.removeItem(`form_${formId}_${jobId}`);
    }
  }

  // Save scroll position
  async saveScrollPosition(viewId, position) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.SCROLL], 'readwrite').objectStore(STORES.SCROLL);
      await store.put({ id: viewId, position, timestamp: Date.now() });
    } catch (error) {
      sessionStorage.setItem(`scroll_${viewId}`, position.toString());
    }
  }

  // Load scroll position
  async loadScrollPosition(viewId) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.SCROLL], 'readonly').objectStore(STORES.SCROLL);
      const request = store.get(viewId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.position || 0);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      const fallback = sessionStorage.getItem(`scroll_${viewId}`);
      return fallback ? parseInt(fallback, 10) : 0;
    }
  }

  // Clean expired drafts (call on app init)
  async cleanExpired() {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readwrite').objectStore(STORES.DRAFTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const now = Date.now();
        request.result.forEach(draft => {
          if (draft.expiresAt < now) {
            store.delete(draft.id);
          }
        });
      };
    } catch (error) {
      console.error('Failed to clean expired drafts:', error);
    }
  }

  // Fallback to sessionStorage
  fallbackSave(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to fallback save:', e);
    }
  }

  fallbackLoad(key) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to fallback load:', e);
      return null;
    }
  }

  // Clear all data for a job (on job completion/deletion)
  async clearJobData(jobId) {
    try {
      await this.ensureDB();
      
      Object.values(STORES).forEach(async (storeName) => {
        const store = this.db.transaction([storeName], 'readwrite').objectStore(storeName);
        const index = store.index('jobId');
        const request = index.getAll(jobId);

        request.onsuccess = () => {
          request.result.forEach(record => store.delete(record.id));
        };
      });
    } catch (error) {
      console.error('Failed to clear job data:', error);
    }
  }
}

// Singleton instance
export const fieldPersistence = new FieldStatePersistence();

// Initialize and clean on app load (O3 FIX: expanded cleanup)
if (typeof window !== 'undefined') {
  fieldPersistence.cleanExpired().catch(console.error);
  
  // O3 FIX: Also cleanup completed operations and old conflicts on app init
  // This ensures long-term IndexedDB health
  import('../offline/FieldOperationQueue').then(({ clearCompletedOperations }) => {
    clearCompletedOperations().catch(console.error);
  }).catch(() => {});
  
  import('../offline/FieldConflictResolver').then(({ clearOldConflicts }) => {
    clearOldConflicts(30).catch(console.error);
  }).catch(() => {});
}