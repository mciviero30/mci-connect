import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Check, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';

// Public VAPID key - In production, this should be environment variable
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDkrUtqfPBkqsQZzPBhKzSNxZ8RvAHjRj9oPpPjqDzn4';

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

export default function PushNotificationManager({ user }) {
  const toast = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
      detectDevice();
    }
  }, []);

  const detectDevice = () => {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      deviceType = 'mobile';
    }

    const browser = ua.includes('Chrome') ? 'Chrome' 
                  : ua.includes('Safari') ? 'Safari'
                  : ua.includes('Firefox') ? 'Firefox'
                  : ua.includes('Edge') ? 'Edge'
                  : 'Unknown';

    setDeviceInfo({ deviceType, browser });
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      if (subscription) {
        // Verify subscription in database
        const subs = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          endpoint: subscription.endpoint,
          active: true
        });
        
        if (subs.length === 0) {
          // Subscription exists in browser but not in DB
          setIsSubscribed(false);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    
    try {
      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        toast.error('Permission denied for notifications');
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Save subscription to database
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        subscription_data: subscription.toJSON(),
        endpoint: subscription.endpoint,
        device_type: deviceInfo?.deviceType || 'desktop',
        browser: deviceInfo?.browser || 'Unknown',
        active: true,
        last_used: new Date().toISOString()
      });

      // Update notification settings
      const settings = await base44.entities.NotificationSettings.filter({ user_email: user.email });
      if (settings.length > 0) {
        await base44.entities.NotificationSettings.update(settings[0].id, {
          push_enabled: true,
          push_subscription: subscription.toJSON()
        });
      } else {
        await base44.entities.NotificationSettings.create({
          user_email: user.email,
          push_enabled: true,
          push_subscription: subscription.toJSON()
        });
      }

      setIsSubscribed(true);
      toast.success('✅ Push notifications enabled!');

      // Send test notification
      setTimeout(() => {
        sendTestNotification();
      }, 1000);

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Deactivate in database
        const subs = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          endpoint: subscription.endpoint
        });

        for (const sub of subs) {
          await base44.entities.PushSubscription.update(sub.id, { active: false });
        }

        // Update notification settings
        const settings = await base44.entities.NotificationSettings.filter({ user_email: user.email });
        if (settings.length > 0) {
          await base44.entities.NotificationSettings.update(settings[0].id, {
            push_enabled: false
          });
        }
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');

    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🎉 MCI Connect', {
        body: 'Push notifications are now enabled! You will receive alerts for important updates.',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200]
      });

      setTimeout(() => notification.close(), 5000);
    }
  };

  if (!isSupported) {
    return (
      <Alert className="bg-amber-50 border-amber-300">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <AlertDescription className="text-amber-900">
          Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Push Notifications
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Get instant alerts on your device for important updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <BellOff className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {isSubscribed ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isSubscribed ? 'Receiving push notifications' : 'Enable to receive alerts'}
              </p>
            </div>
          </div>

          <Button
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
            disabled={isLoading}
            className={isSubscribed 
              ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSubscribed ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>

        {deviceInfo && (
          <div className="flex gap-2">
            <Badge variant="outline" className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600">
              {deviceInfo.deviceType}
            </Badge>
            <Badge variant="outline" className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600">
              {deviceInfo.browser}
            </Badge>
          </div>
        )}

        {permission === 'denied' && (
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700/50">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-900 dark:text-red-200">
              Push notifications are blocked. Please enable them in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">What you'll receive:</h4>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <li>✓ New announcements and company updates</li>
            <li>✓ Job assignments and schedule changes</li>
            <li>✓ Timesheet and expense approvals</li>
            <li>✓ Important system alerts</li>
            <li>✓ Time-off request responses</li>
            <li>✓ Overtime alerts and warnings</li>
            <li>✓ Performance review reminders</li>
            <li>✓ Invoice due date notifications</li>
            <li>✓ Certification expiration alerts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}