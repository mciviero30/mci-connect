import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function NotificationSettings({ user }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);

  const { data: pushSubscription } = useQuery({
    queryKey: ['pushSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.PushSubscription.filter({
        user_email: user.email,
        active: true
      });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: notificationPrefs } = useQuery({
    queryKey: ['notificationPrefs', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      });
      return prefs[0] || null;
    },
    enabled: !!user?.email
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates) => {
      if (notificationPrefs) {
        return base44.entities.NotificationSettings.update(notificationPrefs.id, updates);
      } else {
        return base44.entities.NotificationSettings.create({
          user_email: user.email,
          user_name: user.full_name,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPrefs'] });
      toast.success(language === 'es' ? 'Preferencias guardadas' : 'Preferences saved');
    }
  });

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        toast.success(language === 'es' ? '✅ Notificaciones activadas' : '✅ Notifications enabled');
        
        // Try to register push subscription
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          
          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: null
            });

            const platform = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' :
                           /Android/.test(navigator.userAgent) ? 'android' : 'desktop';

            await base44.entities.PushSubscription.create({
              user_email: user.email,
              user_name: user.full_name,
              endpoint: subscription.endpoint,
              keys: JSON.stringify(subscription.toJSON().keys || {}),
              device_type: platform,
              active: true,
              subscribed_at: new Date().toISOString()
            });

            queryClient.invalidateQueries({ queryKey: ['pushSubscription'] });
          } catch (subError) { /* intentionally silenced */ }

        }
      } else {
        toast.error(language === 'es' ? '❌ Permiso denegado' : '❌ Permission denied');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error(language === 'es' ? 'Error al activar notificaciones' : 'Failed to enable notifications');
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Create test notification in database
      await base44.entities.Notification.create({
        recipient_email: user.email,
        recipient_name: user.full_name,
        title: '🔔 Test Notification',
        message: 'This is a test notification. If you see this, notifications are working!',
        type: 'system_alert',
        priority: 'medium',
        link: '/page/NotificationCenter',
        read: false
      });

      // Also send browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('🔔 Test Notification', {
          body: 'This is a test notification. Notifications are working!',
          icon: '/logo192.png',
          badge: '/badge-icon.png',
          vibrate: [200, 100, 200]
        });
      }

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(language === 'es' ? '✅ Notificación de prueba enviada' : '✅ Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error(language === 'es' ? 'Error al enviar prueba' : 'Failed to send test');
    } finally {
      setIsTesting(false);
    }
  };

  const notificationEnabled = Notification.permission === 'granted';
  const platform = /iPhone|iPad|iPos/.test(navigator.userAgent) ? 'iOS' :
                   /Android/.test(navigator.userAgent) ? 'Android' : 'Desktop';

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Bell className="w-5 h-5 text-indigo-600" />
              {language === 'es' ? 'Notificaciones Push' : 'Push Notifications'}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
              {language === 'es' 
                ? 'Recibe alertas instantáneas en tu dispositivo' 
                : 'Receive instant alerts on your device'}
            </CardDescription>
          </div>
          <Badge className="soft-blue-gradient text-xs">
            <Smartphone className="w-3 h-3 mr-1" />
            {platform}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            {notificationEnabled ? (
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            <div>
              <Label className="font-semibold text-slate-900 dark:text-white">
                {language === 'es' ? 'Notificaciones' : 'Notifications'}
              </Label>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {notificationEnabled 
                  ? (language === 'es' ? '✓ Activadas' : '✓ Enabled')
                  : (language === 'es' ? 'Activar para recibir alertas' : 'Enable to receive alerts')}
              </p>
            </div>
          </div>
          {!notificationEnabled && (
            <Button onClick={handleEnableNotifications} className="soft-green-gradient text-white rounded-xl shadow-lg">
              {language === 'es' ? 'Activar' : 'Enable'}
            </Button>
          )}
        </div>

        {/* Notification Types */}
        {notificationEnabled && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Tipos de Notificación' : 'Notification Types'}
            </Label>
            
            <div className="space-y-2">
              {[
                { key: 'job_assignments', label: language === 'es' ? 'Asignaciones de Trabajo' : 'Job Assignments', icon: '📋' },
                { key: 'schedule_changes', label: language === 'es' ? 'Cambios de Horario' : 'Schedule Changes', icon: '🔄' },
                { key: 'payroll_updates', label: language === 'es' ? 'Actualizaciones de Payroll' : 'Payroll Updates', icon: '✅' },
                { key: 'ceo_broadcasts', label: language === 'es' ? 'Alertas del CEO/Admin' : 'CEO/Admin Broadcasts', icon: '🚨' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <Switch
                    checked={notificationPrefs?.[item.key] !== false}
                    onCheckedChange={(checked) => {
                      updatePrefsMutation.mutate({ [item.key]: checked });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Notification Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleTestNotification}
            disabled={!notificationEnabled || isTesting}
            variant="outline"
            className="w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-xl"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                {language === 'es' ? 'Enviando...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Enviar Notificación de Prueba' : 'Send Test Notification'}
              </>
            )}
          </Button>
        </div>

        {/* Platform Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {language === 'es' 
            ? '💡 Las notificaciones funcionan en iOS, Android y Desktop' 
            : '💡 Notifications work on iOS, Android and Desktop'}
        </div>
      </CardContent>
    </Card>
  );
}