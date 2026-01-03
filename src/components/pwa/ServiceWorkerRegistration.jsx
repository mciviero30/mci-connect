import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export default function ServiceWorkerRegistration() {
  const { toast } = useToast();

  useEffect(() => {
    // EMERGENCY FIX: Completely disable Service Worker and clear all caches
    const emergencyCacheClear = async () => {
      if ('serviceWorker' in navigator) {
        // 1. Unregister ALL service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('🗑️ Service Worker unregistered');
        }

        // 2. Clear ALL caches
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('🧹 Cache deleted:', cacheName);
        }

        // 3. Clear localStorage flags
        localStorage.removeItem('sw-cache-version');
        
        console.log('✅ Emergency cache clear completed');
      }
    };

    emergencyCacheClear();

    // DO NOT re-register Service Worker - keep it disabled
  }, []);

  return null;
}