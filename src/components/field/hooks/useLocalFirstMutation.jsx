import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// IndexedDB wrapper
const DB_NAME = 'mci_field_offline';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_sync')) {
        const store = db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
        store.createIndex('entity', 'entity', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

const saveToIndexedDB = async (entity, operation, data) => {
  const db = await openDB();
  const tx = db.transaction('pending_sync', 'readwrite');
  const store = tx.objectStore('pending_sync');
  
  await store.add({
    entity,
    operation,
    data,
    timestamp: Date.now(),
    pending_sync: true
  });
};

const getPendingSync = async () => {
  const db = await openDB();
  const tx = db.transaction('pending_sync', 'readonly');
  const store = tx.objectStore('pending_sync');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const clearSyncedItem = async (id) => {
  const db = await openDB();
  const tx = db.transaction('pending_sync', 'readwrite');
  const store = tx.objectStore('pending_sync');
  await store.delete(id);
};

export function useLocalFirstMutation({ 
  entity, 
  queryKey, 
  mutationFn 
}) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (data) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticData = { ...data, id: tempId, _pending: true };

    try {
      setIsLoading(true);

      // 1. Update cache immediately (optimistic)
      queryClient.setQueryData(queryKey, (old = []) => [...old, optimisticData]);

      // 2. Save to IndexedDB
      await saveToIndexedDB(entity, 'create', data);

      // 3. Sync to server (background, non-blocking)
      setTimeout(async () => {
        try {
          const result = await mutationFn(data);
          
          // Replace temp record with real one
          queryClient.setQueryData(queryKey, (old = []) => 
            old.map(item => item.id === tempId ? result : item)
          );
          
          // Clear from IndexedDB
          const pending = await getPendingSync();
          const syncItem = pending.find(p => 
            p.entity === entity && 
            JSON.stringify(p.data) === JSON.stringify(data)
          );
          if (syncItem) {
            await clearSyncedItem(syncItem.id);
          }
        } catch (error) {
          console.error('Background sync failed:', error);
          // Keep in IndexedDB for retry
        }
      }, 0);

      setIsLoading(false);
      return optimisticData;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  return { mutate, isLoading };
}

export function useLocalFirstUpdate({ 
  entity, 
  queryKey, 
  mutationFn 
}) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async ({ id, data }) => {
    try {
      setIsLoading(true);

      // 1. Update cache immediately (optimistic)
      queryClient.setQueryData(queryKey, (old = []) => 
        old.map(item => item.id === id ? { ...item, ...data, _pending: true } : item)
      );

      // 2. Save to IndexedDB
      await saveToIndexedDB(entity, 'update', { id, data });

      // 3. Sync to server (background)
      setTimeout(async () => {
        try {
          const result = await mutationFn({ id, data });
          
          // Update with server response
          queryClient.setQueryData(queryKey, (old = []) => 
            old.map(item => item.id === id ? result : item)
          );
          
          // Clear from IndexedDB
          const pending = await getPendingSync();
          const syncItem = pending.find(p => 
            p.entity === entity && 
            p.data.id === id
          );
          if (syncItem) {
            await clearSyncedItem(syncItem.id);
          }
        } catch (error) {
          console.error('Background sync failed:', error);
        }
      }, 0);

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  return { mutate, isLoading };
}

// Background sync service
export const startBackgroundSync = () => {
  setInterval(async () => {
    try {
      const pending = await getPendingSync();
      
      for (const item of pending) {
        try {
          // Retry sync for each pending item
          // This would need proper mutation logic per entity
        } catch (error) {
          console.error('Sync retry failed:', error);
        }
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, 30000); // Every 30s
};