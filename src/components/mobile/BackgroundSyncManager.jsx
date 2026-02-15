import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Background Sync API for mobile devices
 * Queues mutations when offline, syncs when connectivity returns
 */
export default function BackgroundSyncManager() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      console.log('Background Sync not supported - using fallback');
      return;
    }

    const registerBackgroundSync = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Listen for sync events
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            toast.success('✅ All offline changes synced successfully');
          } else if (event.data.type === 'SYNC_FAILED') {
            toast.error('⚠️ Some changes failed to sync - will retry automatically');
          }
        });

        // Register periodic background sync (mobile only)
        if ('periodicSync' in registration) {
          try {
            await registration.periodicSync.register('sync-offline-queue', {
              minInterval: 60 * 60 * 1000, // Every hour
            });
            console.log('✅ Periodic background sync registered');
          } catch (error) {
            console.log('Periodic sync not available:', error);
          }
        }
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    };

    registerBackgroundSync();
  }, []);

  return null;
}