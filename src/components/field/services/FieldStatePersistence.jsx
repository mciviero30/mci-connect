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
  // FASE 3C-4: CRITICAL - Use measurement_session_id for measurement drafts to prevent collisions
  async saveDraft(type, jobId, data, expiryHours = 24, measurementSessionId = null) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readwrite').objectStore(STORES.DRAFTS);
      
      // FASE 3C-4: Use measurement_session_id as primary key for measurement drafts
      const draftKey = measurementSessionId 
        ? `${type}_${measurementSessionId}` 
        : `${type}_${jobId}_${Date.now()}`;
      
      const draft = {
        id: draftKey,
        type,
        jobId,
        measurementSessionId, // FASE 3C-4: Store session ID for scoped restore
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
      };

      await store.put(draft);
      return draft.id;
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Fallback to sessionStorage
      const fallbackKey = measurementSessionId ? `draft_${type}_${measurementSessionId}` : `draft_${type}_${jobId}`;
      this.fallbackSave(fallbackKey, data);
    }
  }

  // Load latest draft for type and job
  // FASE 3C-4: CRITICAL - Load draft by measurement_session_id for measurements
  async loadDraft(type, jobId, measurementSessionId = null) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readonly').objectStore(STORES.DRAFTS);
      
      // FASE 3C-4: For measurements, MUST match exact session ID (no fallback to jobId)
      if (measurementSessionId) {
        const draftKey = `${type}_${measurementSessionId}`;
        const request = store.get(draftKey);
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const draft = request.result;
            if (draft && draft.expiresAt > Date.now()) {
              resolve(draft.data);
            } else {
              resolve(null); // No draft for this measurement session
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
      
      // Non-measurement drafts: use jobId index (legacy behavior)
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const drafts = request.result
            .filter(d => d.type === type && d.expiresAt > Date.now() && !d.measurementSessionId) // FASE 3C-4: Exclude measurement sessions
            .sort((a, b) => b.timestamp - a.timestamp);
          resolve(drafts[0]?.data || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load draft:', error);
      // Fallback to sessionStorage
      const fallbackKey = measurementSessionId ? `draft_${type}_${measurementSessionId}` : `draft_${type}_${jobId}`;
      return this.fallbackLoad(fallbackKey);
    }
  }

  // Clear specific draft
  // FASE 3C-4: Clear by measurement_session_id for measurements
  async clearDraft(type, jobId, measurementSessionId = null) {
    try {
      await this.ensureDB();
      const store = this.db.transaction([STORES.DRAFTS], 'readwrite').objectStore(STORES.DRAFTS);
      
      // FASE 3C-4: For measurements, delete by exact session ID
      if (measurementSessionId) {
        const draftKey = `${type}_${measurementSessionId}`;
        await store.delete(draftKey);
        return;
      }
      
      // Non-measurement: delete all matching type+jobId
      const index = store.index('jobId');
      const request = index.getAll(jobId);

      request.onsuccess = () => {
        const drafts = request.result.filter(d => d.type === type && !d.measurementSessionId);
        drafts.forEach(draft => store.delete(draft.id));
      };
    } catch (error) {
      console.error('Failed to clear draft:', error);
      const fallbackKey = measurementSessionId ? `draft_${type}_${measurementSessionId}` : `draft_${type}_${jobId}`;
      sessionStorage.removeItem(fallbackKey);
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