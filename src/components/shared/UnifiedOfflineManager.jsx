import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ============================================
// UNIFIED OFFLINE MANAGER
// Consolidates OfflineManager + FieldOfflineManager
// Single IndexedDB wrapper, single context
// ============================================

const DB_NAME = 'mci_unified_offline';
const DB_VERSION = 2;

// Stores configuration - extensible
const STORES = ['tasks', 'plans', 'jobs', 'photos', 'documents', 'timeEntries', 'expenses', 'pendingMutations', 'syncMeta'];

class OfflineDB {
  static instance = null;
  db = null;

  static getInstance() {
    if (!OfflineDB.instance) {
      OfflineDB.instance = new OfflineDB();
    }
    return OfflineDB.instance;
  }

  async open() {
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
        STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const keyPath = storeName === 'pendingMutations' ? { keyPath: 'id', autoIncrement: true } : { keyPath: 'id' };
            db.createObjectStore(storeName, keyPath);
          }
        });
      };
    });
  }

  async save(storeName, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      if (Array.isArray(data)) {
        store.clear();
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(storeName, id = null) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = id ? store.get(id) : store.getAll();

      request.onsuccess = () => resolve(request.result || (id ? null : []));
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async queueMutation(mutation) {
    return this.save('pendingMutations', {
      ...mutation,
      timestamp: Date.now(),
      retries: 0
    });
  }

  async getPendingMutations() {
    return this.get('pendingMutations');
  }

  async clearMutation(id) {
    return this.delete('pendingMutations', id);
  }
}

// Singleton instance
const offlineDB = OfflineDB.getInstance();

// Export for direct use
export const saveOfflineData = (store, data) => offlineDB.save(store, data);
export const getOfflineData = (store, id) => offlineDB.get(store, id);
export const queueOfflineAction = (action) => offlineDB.queueMutation(action);

// Context
const OfflineContext = createContext({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: () => {},
  lastSync: null,
});

export const useOffline = () => useContext(OfflineContext);

// Unified Provider
export function UnifiedOfflineProvider({ children, onSync }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const syncInProgress = useRef(false);

  // Update pending count efficiently
  const updatePendingCount = useCallback(async () => {
    const pending = await offlineDB.getPendingMutations();
    setPendingCount(pending.length);
    return pending;
  }, []);

  // Sync function with retry logic
  const syncNow = useCallback(async () => {
    if (!isOnline || syncInProgress.current) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const pending = await offlineDB.getPendingMutations();

      for (const mutation of pending) {
        try {
          // Execute mutation via callback
          if (onSync) {
            await onSync(mutation);
          }
          await offlineDB.clearMutation(mutation.id);
        } catch (err) {
          // Increment retry count, remove after 3 failures
          if (mutation.retries >= 3) {
            console.error('Mutation failed after 3 retries, removing:', mutation);
            await offlineDB.clearMutation(mutation.id);
          } else {
            await offlineDB.save('pendingMutations', {
              ...mutation,
              retries: (mutation.retries || 0) + 1
            });
          }
        }
      }

      setLastSync(new Date());
      await updatePendingCount();
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [isOnline, onSync, updatePendingCount]);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Initial count and periodic check (reduced frequency)
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 60000); // Every minute instead of 10/30 seconds
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow, lastSync }}>
      {children}
    </OfflineContext.Provider>
  );
}

// Compact Status Badge
export function OfflineStatusBadge() {
  const { isOnline, pendingCount, syncNow, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50">
      <button
        onClick={syncNow}
        disabled={isSyncing || !isOnline}
        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-colors ${
          isOnline ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500'
        } text-white`}
      >
        {isOnline ? (
          <>
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{pendingCount} pending</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
            {pendingCount > 0 && (
              <Badge className="bg-white/20 text-white text-xs ml-1">
                {pendingCount}
              </Badge>
            )}
          </>
        )}
      </button>
    </div>
  );
}

// Optimized hook for offline-first data
export function useOfflineData(storeName, fetchFn, filterFn = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useOffline();
  const hasFetched = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      // Load cached first
      const cached = await getOfflineData(storeName);
      if (!cancelled && cached?.length > 0) {
        const filtered = filterFn ? cached.filter(filterFn) : cached;
        setData(filtered);
        setLoading(false);
      }

      // Fetch fresh if online and not already fetched
      if (isOnline && fetchFn && !hasFetched.current) {
        try {
          const fresh = await fetchFn();
          if (!cancelled) {
            const filtered = filterFn ? fresh.filter(filterFn) : fresh;
            setData(filtered);
            await saveOfflineData(storeName, fresh);
            hasFetched.current = true;
          }
        } catch (err) {
          console.error('Fetch error:', err);
        }
      }

      if (!cancelled) setLoading(false);
    };

    loadData();
    return () => { cancelled = true; };
  }, [storeName, isOnline]);

  return { data, loading, isOnline };
}