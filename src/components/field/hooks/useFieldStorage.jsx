import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fieldStorage } from '../services/FieldStorageService';
import { syncQueue } from '../services/SyncQueueService';
import { base44 } from '@/api/base44Client';

export function useFieldStorage(storeName, jobId) {
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load local data on mount
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const data = await fieldStorage.getByJobId(storeName, jobId);
        setLocalData(data);
      } catch (error) {
        console.error('Failed to load local data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocal();
  }, [storeName, jobId]);

  // Save with local-first pattern
  const save = async (data) => {
    const record = await fieldStorage.save(storeName, { ...data, job_id: jobId });
    setLocalData(prev => [...prev, record]);
    
    // Trigger sync queue
    syncQueue.processQueue();

    return record;
  };

  // Update with local-first pattern
  const update = async (id, updates) => {
    const record = await fieldStorage.update(storeName, id, updates);
    setLocalData(prev => prev.map(item => item.id === id ? record : item));
    
    // Trigger sync queue
    syncQueue.processQueue();

    return record;
  };

  return { localData, isLoading, save, update };
}