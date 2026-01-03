import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export default function ServiceWorkerRegistration() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // CRITICAL: Clear all caches on mount in development
      if (import.meta.env.DEV) {
        caches.keys().then(keys => {
          keys.forEach(key => caches.delete(key));
          console.log('🧹 DEV: All caches cleared');
        });
      }

      // Unregister old service workers to force fresh start
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('🗑️ Unregistered old service worker');
        });
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);

            // Force immediate update check
            registration.update();

            // Handle updates - Auto-reload on new version
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New version detected - Auto-reloading...');
                  window.location.reload();
                }
              });
            });
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 New Service Worker activated - Reloading...');
          window.location.reload();
        });
      });
    }
  }, [toast]);

  return null;
}