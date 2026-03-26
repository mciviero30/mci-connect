import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Universal Push Notification Manager - Works on iOS, Android, Desktop
export default function UniversalPushManager({ user }) {
  const { data: pushSubscription } = useQuery({
    queryKey: ['pushSubscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.PushSubscription.filter({
        user_email: user.email,
        active: true
      });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (!user?.email) return;
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;

    const detectPlatform = () => {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
      if (/Android/.test(ua)) return 'android';
      return 'desktop';
    };

    const setupPushNotifications = async () => {
      try {
        // Check if running in iframe (preview mode) - skip notifications
        if (window.self !== window.top) {
          return;
        }

        // Check current permission status
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'denied') {
          return;
        }

        // DO NOT request permission on mount - wait for user interaction
        // Permission will be requested when user clicks notification bell or settings
        if (currentPermission !== 'granted') {
          return;
        }

        // Register service worker
        let registration;
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
          await navigator.serviceWorker.ready;
        } catch (error) {
          return;
        }

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // For Web Push without FCM, we can use a simple subscribe
          // Note: For production, you'd configure FCM and get VAPID keys
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: null // Will work for basic web push
            });

            const platform = detectPlatform();

            // Save subscription to database
            await base44.entities.PushSubscription.create({
              user_email: user.email,
              user_name: user.full_name,
              endpoint: subscription.endpoint,
              keys: JSON.stringify(subscription.toJSON().keys || {}),
              device_type: platform,
              active: true,
              subscribed_at: new Date().toISOString()
            });

          } catch (subError) { /* intentionally silenced */ }

        }

        // Set badge support (works on Android and some iOS PWAs)
        if ('setAppBadge' in navigator) {
          // Badge API available
          window.updateBadgeCount = async (count) => {
            try {
              if (count > 0) {
                await navigator.setAppBadge(count);
              } else {
                await navigator.clearAppBadge();
              }
            } catch (error) { /* intentionally silenced */ }

          };
        }

      } catch (error) {
        console.error('Failed to setup push notifications:', error);
      }
    };

    const platform = detectPlatform();

    // iOS requires user interaction for notification permission
    if (platform === 'ios') {
      const handleFirstInteraction = () => {
        setupPushNotifications();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };

      document.addEventListener('click', handleFirstInteraction, { once: true });
      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    } else {
      // Android and Desktop can request immediately
      setupPushNotifications();
    }

  }, [user?.email, user?.full_name]);

  // Update badge count when notifications change
  useEffect(() => {
    if (!user?.email) return;
    if (!('setAppBadge' in navigator)) return;

    const updateBadge = async () => {
      try {
        const unreadNotifs = await base44.entities.Notification.filter({
          recipient_email: user.email,
          read: false
        });
        
        if (window.updateBadgeCount) {
          window.updateBadgeCount(unreadNotifs.length);
        }
      } catch (error) { /* intentionally silenced */ }

    };

    updateBadge();
    const interval = setInterval(updateBadge, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [user?.email]);

  return null;
}