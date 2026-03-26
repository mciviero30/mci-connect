import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export default function ServiceWorkerRegistration() {
  const { toast } = useToast();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let updateInterval = null;

    const handleSWMessage = (event) => {
      if (event.data.type === 'CACHE_UPDATED') { /* intentionally silenced */ }
    };

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates periodically
          updateInterval = setInterval(() => {
            registration.update();
          }, 600000); // Every 10 minutes

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

      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    };

    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [toast]);

  return null;
}