/**
 * Prompt #85: Offline Manager - Main orchestrator
 * Handles network detection, initialization, and coordination
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { initDB } from './indexedDBWrapper';
import { syncMutations, getPendingCount } from './mutationQueue';
import OfflineIndicator from './OfflineIndicator';

// Create context for offline state
const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        const count = await getPendingCount();
        setPendingCount(count);
        setIsInitialized(true);
        console.log('✅ Offline Manager initialized. Pending mutations:', count);
      } catch (error) {
        console.error('❌ Failed to initialize Offline Manager:', error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: ONLINE');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 Network: OFFLINE');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      console.log('🔄 Network restored. Auto-syncing pending mutations...');
      syncMutations().then(result => {
        if (result.synced > 0) {
          getPendingCount().then(setPendingCount);
        }
      });
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    if (!isInitialized) return;

    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  const handleSyncComplete = async (result) => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  const value = {
    isOnline,
    isInitialized,
    pendingCount
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      {isInitialized && (
        <OfflineIndicator 
          isOnline={isOnline} 
          onSyncComplete={handleSyncComplete}
        />
      )}
    </OfflineContext.Provider>
  );
}