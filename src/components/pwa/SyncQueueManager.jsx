import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';
import { normalizeQuoteForSave, normalizeInvoiceForSave } from '../utils/dataValidation';
import { generateQuoteNumber } from '@/functions/generateQuoteNumber';
import { generateInvoiceNumber } from '@/functions/generateInvoiceNumber';

const SyncQueueContext = createContext();

export function useSyncQueue() {
  const context = useContext(SyncQueueContext);
  if (!context) {
    throw new Error('useSyncQueue must be used within SyncQueueProvider');
  }
  return context;
}

const STORAGE_KEY = 'mci_sync_queue';
const MAX_RETRIES = 3;

export function SyncQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setQueue(parsed);
        console.log('📦 Loaded sync queue:', parsed.length, 'items');
      }
    } catch (error) {
      console.error('❌ Error loading sync queue:', error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('❌ Error saving sync queue:', error);
    }
  }, [queue]);

  // Add item to queue ONLY if offline
  const addToQueue = useCallback((operation) => {
    // CRITICAL: Only queue if offline, otherwise execute immediately
    if (navigator.onLine) {
      console.log('🌐 Online: executing operation directly (not queueing)');
      return null;
    }

    // Store entity ID separately from queue ID
    const queueItem = {
      queueId: Date.now() + Math.random(),
      entityId: operation.entityId, // REAL entity ID for update/delete
      timestamp: new Date().toISOString(),
      retries: 0,
      entity: operation.entity,
      operation: operation.operation,
      data: operation.data,
    };

    setQueue(prev => [...prev, queueItem]);
    console.log('📴 Offline: Added to sync queue:', queueItem);
    
    return queueItem.queueId;
  }, []);

  // Process queue
  const processQueue = useCallback(async () => {
    if (!navigator.onLine || queue.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    console.log('🔄 Processing sync queue:', queue.length, 'items');

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const item of queue) {
      try {
        await executeOperation(item);

        // Remove from queue on success
        setQueue(prev => prev.filter(i => i.queueId !== item.queueId));
        results.success++;

        console.log('✅ Synced:', item.entity, item.operation);
      } catch (error) {
        console.error('❌ Sync failed:', item, error);
        
        // Increment retry count
        if (item.retries < MAX_RETRIES) {
          setQueue(prev => prev.map(i => 
            i.queueId === item.queueId 
              ? { ...i, retries: i.retries + 1, lastError: error.message }
              : i
          ));
        } else {
          // Remove after max retries
          setQueue(prev => prev.filter(i => i.queueId !== item.queueId));
          results.failed++;
          results.errors.push({ item, error: error.message });
        }
      }
    }

    setIsSyncing(false);

    // Show results
    if (results.success > 0) {
      toast.success(`✅ Sincronizados ${results.success} cambios`);
    }

    if (results.failed > 0) {
      toast.error(`❌ ${results.failed} cambios fallaron`);
    }

    console.log('📊 Sync results:', results);
  }, [queue, isSyncing, toast]);

  // Execute a single operation (replay from offline queue)
  const executeOperation = async (item) => {
    const { entity, operation, data, entityId } = item;

    // Use stored data AS-IS (already normalized before queueing)
    let finalData = data;

    // ONLY generate numbers if missing (prevent duplicates)
    if (entity === 'Quote' && operation === 'create' && !finalData.quote_number) {
      const response = await generateQuoteNumber({});
      finalData = { ...finalData, quote_number: response.data.quote_number };
    } else if (entity === 'Invoice' && operation === 'create' && !finalData.invoice_number) {
      const response = await generateInvoiceNumber({});
      finalData = { ...finalData, invoice_number: response.data.invoice_number };
    }

    switch (operation) {
      case 'create':
        return await base44.entities[entity].create(finalData);
      
      case 'update':
        if (!entityId) throw new Error('entityId required for update');
        return await base44.entities[entity].update(entityId, finalData);
      
      case 'delete':
        if (!entityId) throw new Error('entityId required for delete');
        return await base44.entities[entity].delete(entityId);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  };

  // Sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      console.log('📡 Connection restored, processing queue...');
      setTimeout(() => processQueue(), 1000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue]);

  // Listen for service worker sync events
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_PENDING_DATA') {
          processQueue();
        }
      });
    }
  }, [processQueue]);

  // Periodic sync when online
  useEffect(() => {
    if (!navigator.onLine || queue.length === 0) return;

    const interval = setInterval(() => {
      processQueue();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [queue.length, processQueue]);

  const value = {
    queue,
    pendingCount: queue.length,
    isSyncing,
    addToQueue,
    syncNow: processQueue,
    clearQueue: () => setQueue([])
  };

  return (
    <SyncQueueContext.Provider value={value}>
      {children}
    </SyncQueueContext.Provider>
  );
}