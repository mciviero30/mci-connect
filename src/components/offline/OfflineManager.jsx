import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPendingCount, syncMutations } from './mutationQueue';

const OfflineContext = createContext();

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    retry: false,
  });

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // SILENT background sync - no notifications
  const syncSilently = async () => {
    try {
      const result = await syncMutations();
      console.log(`Offline sync: ${result.synced} synced, ${result.failed} failed`);
      const newCount = await getPendingCount();
      setPendingCount(newCount);
    } catch (error) {
      console.error('Silent sync failed:', error);
    }
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      const count = await getPendingCount();
      if (count > 0 && !isSyncing) {
        setIsSyncing(true);
        await syncSilently();
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSyncing, user]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
};