import React, { useState, useEffect, createContext, useContext } from 'react';
import { WifiOff, Wifi, CloudOff, Cloud, RefreshCw, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

// IndexedDB wrapper for offline storage
const DB_NAME = 'mci_field_offline';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('plans')) {
        db.createObjectStore('plans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('jobs')) {
        db.createObjectStore('jobs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('syncMeta')) {
        db.createObjectStore('syncMeta', { keyPath: 'key' });
      }
    };
  });
};

// Save data to offline storage
export const saveOfflineData = async (storeName, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    if (Array.isArray(data)) {
      // Clear existing and add all
      await store.clear();
      for (const item of data) {
        await store.put(item);
      }
    } else {
      await store.put(data);
    }
    
    // Update sync metadata
    const metaTx = db.transaction('syncMeta', 'readwrite');
    const metaStore = metaTx.objectStore('syncMeta');
    await metaStore.put({ key: `${storeName}_lastSync`, value: new Date().toISOString() });
    
    db.close();
    return true;
  } catch (error) {
    console.error('Error saving offline data:', error);
    return false;
  }
};

// Get data from offline storage
export const getOfflineData = async (storeName, id = null) => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    let result;
    if (id) {
      result = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      result = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    
    db.close();
    return result;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return id ? null : [];
  }
};

// Queue an action for later sync
export const queueOfflineAction = async (action) => {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    await store.add({
      ...action,
      timestamp: new Date().toISOString(),
      synced: false
    });
    
    db.close();
    return true;
  } catch (error) {
    console.error('Error queuing offline action:', error);
    return false;
  }
};

// Get pending actions
export const getPendingActions = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    
    const result = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.filter(a => !a.synced));
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return result;
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return [];
  }
};

// Clear synced actions
export const clearSyncedActions = async (ids) => {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    for (const id of ids) {
      await store.delete(id);
    }
    
    db.close();
    return true;
  } catch (error) {
    console.error('Error clearing synced actions:', error);
    return false;
  }
};

// Offline Context
const OfflineContext = createContext({
  isOnline: true,
  pendingCount: 0,
  lastSync: null,
  syncNow: () => {},
});

export const useOffline = () => useContext(OfflineContext);

// Offline Provider Component
export function FieldOfflineProvider({ children, jobId }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending actions periodically
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const syncNow = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const pending = await getPendingActions();
      const syncedIds = [];
      
      for (const action of pending) {
        try {
          // Execute the pending action via Base44 API
          if (action.type === 'createTask') {
            await base44.entities.Task.create(action.data);
          } else if (action.type === 'updateTask') {
            await base44.entities.Task.update(action.taskId, action.data);
          } else if (action.type === 'deleteTask') {
            await base44.entities.Task.delete(action.taskId);
          } else if (action.type === 'createPhoto') {
            await base44.entities.Photo.create(action.data);
          }
          
          console.log('✓ Synced action:', action.type);
          syncedIds.push(action.id);
        } catch (err) {
          console.error('Failed to sync action:', err);
        }
      }
      
      if (syncedIds.length > 0) {
        await clearSyncedActions(syncedIds);
        setPendingCount(prev => prev - syncedIds.length);
      }
      
      setLastSync(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, lastSync, syncNow, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
}

// Offline Status Indicator Component
export function OfflineStatusBadge() {
  const { isOnline, pendingCount, syncNow, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-[45]">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${
        isOnline 
          ? 'bg-amber-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? (
          <>
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {pendingCount} pending
            </span>
            <button 
              onClick={syncNow}
              disabled={isSyncing}
              className="ml-1 p-1 hover:bg-white/20 rounded-full"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
            {pendingCount > 0 && (
              <Badge className="bg-white/20 text-white text-xs">
                {pendingCount}
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Hook to use offline-first data
export function useOfflineData(storeName, fetchFn, jobId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useOffline();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // First, try to get cached data
      const cached = await getOfflineData(storeName);
      if (cached && cached.length > 0) {
        const filtered = jobId 
          ? cached.filter(item => item.job_id === jobId)
          : cached;
        setData(filtered);
        setLoading(false);
      }
      
      // If online, fetch fresh data
      if (isOnline && fetchFn) {
        try {
          const fresh = await fetchFn();
          setData(fresh);
          // Cache for offline use
          await saveOfflineData(storeName, fresh);
        } catch (err) {
          console.error('Error fetching data:', err);
          // Keep using cached data
        }
      }
      
      setLoading(false);
    };

    loadData();
  }, [storeName, isOnline, jobId]);

  return { data, loading, isOnline };
}