import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fieldStorage } from '../services/FieldStorageService';
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

    // Background sync
    setTimeout(async () => {
      try {
        const entityMap = {
          tasks: 'Task',
          incidents: 'SafetyIncident',
          photos: 'Photo',
          progress: 'ProjectMilestone',
          notes: 'ChatMessage'
        };

        const result = await base44.entities[entityMap[storeName]].create(data);
        await fieldStorage.markSynced(storeName, record.id);
        await fieldStorage.removeSyncQueueItem(record.id);
        
        setLocalData(prev => prev.map(item => item.id === record.id ? result : item));
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }, 100);

    return record;
  };

  // Update with local-first pattern
  const update = async (id, updates) => {
    const record = await fieldStorage.update(storeName, id, updates);
    setLocalData(prev => prev.map(item => item.id === id ? record : item));

    // Background sync
    setTimeout(async () => {
      try {
        const entityMap = {
          tasks: 'Task',
          incidents: 'SafetyIncident',
          photos: 'Photo',
          progress: 'ProjectMilestone',
          notes: 'ChatMessage'
        };

        const result = await base44.entities[entityMap[storeName]].update(id, updates);
        await fieldStorage.markSynced(storeName, id);
        
        setLocalData(prev => prev.map(item => item.id === id ? result : item));
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }, 100);

    return record;
  };

  return { localData, isLoading, save, update };
}