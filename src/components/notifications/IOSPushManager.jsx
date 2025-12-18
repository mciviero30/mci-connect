import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function IOSPushManager({ user }) {
  const { data: pushSubscription } = useQuery({
    queryKey: ['pushSubscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.PushSubscription.filter({
        user_email: user.email
      });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (!user?.email) return;
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;

    const setupPushNotifications = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Subscribe to push notifications
          const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // You'll need to generate this
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });

          // Save subscription to database
          await base44.entities.PushSubscription.create({
            user_email: user.email,
            user_name: user.full_name,
            endpoint: subscription.endpoint,
            keys: JSON.stringify(subscription.toJSON().keys),
            device_type: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'other',
            active: true
          });
        }

        // Set up notification click handler
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'notification-click') {
            const url = event.data.url;
            if (url) {
              window.location.href = url;
            }
          }
        });

      } catch (error) {
        console.error('Failed to setup push notifications:', error);
      }
    };

    // iOS requires user interaction to request notification permission
    // We'll set it up on first interaction
    const handleFirstInteraction = () => {
      setupPushNotifications();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Auto-setup for non-iOS
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setupPushNotifications();
    } else {
      // Wait for first interaction on iOS
      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);
    }

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [user?.email, user?.full_name]);

  return null;
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}