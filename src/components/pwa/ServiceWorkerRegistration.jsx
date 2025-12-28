import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export default function ServiceWorkerRegistration() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute

            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.info('Nueva versión disponible. Recarga la app para actualizar.');
                }
              });
            });
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'CACHE_UPDATED') {
            console.log('📦 Cache updated:', event.data.url);
          }
        });
      });
    }
  }, [toast]);

  return null;
}