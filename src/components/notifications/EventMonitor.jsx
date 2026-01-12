import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Monitors important events and triggers notifications:
 * - Job deadlines approaching (3 days)
 * - Expense status changes
 * - Job assignments
 */
export default function EventMonitor({ user }) {
  const { toast } = useToast();

  // Monitor job deadlines
  const { data: jobsApproaching } = useQuery({
    queryKey: ['jobs-approaching-deadline', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const jobs = await base44.entities.Job.list('-updated_date', 50);
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      return jobs.filter(job => {
        if (!job.end_date_field && !job.completed_date) return false;
        const endDate = new Date(job.end_date_field || job.completed_date);
        return endDate > today && endDate <= threeDaysFromNow && job.status !== 'completed';
      });
    },
    enabled: !!user?.email,
    staleTime: 60000, // Check every 1 minute
    refetchInterval: 60000
  });

  // Monitor expense status changes
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.Expense.subscribe((event) => {
      if (event.type === 'update' && event.data.employee_email === user.email) {
        const statusChanged = event.data.status === 'approved' || event.data.status === 'rejected';
        
        if (statusChanged) {
          const message = event.data.status === 'approved' 
            ? `Gasto de $${event.data.amount} aprobado ✓`
            : `Gasto de $${event.data.amount} rechazado`;
          
          // Send push notification
          sendPushNotification({
            title: 'Cambio en Gastos',
            body: message,
            tag: `expense-${event.data.id}`,
            data: { 
              url: '/MisGastos',
              type: 'expense_status_changed'
            }
          });

          // Also show toast
          toast({
            title: 'Cambio en Gastos',
            description: message,
            variant: event.data.status === 'approved' ? 'default' : 'destructive'
          });
        }
      }
    });

    return unsubscribe;
  }, [user?.email]);

  // Notify when jobs are approaching deadline
  useEffect(() => {
    if (jobsApproaching && jobsApproaching.length > 0) {
      jobsApproaching.forEach(job => {
        const daysRemaining = Math.ceil(
          (new Date(job.end_date_field || job.completed_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        sendPushNotification({
          title: 'Fecha Límite Próxima',
          body: `${job.name} vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`,
          tag: `deadline-${job.id}`,
          data: {
            url: `/JobDetails?id=${job.id}`,
            type: 'deadline_approaching'
          },
          badge: '/notification-badge.png'
        });
      });
    }
  }, [jobsApproaching]);

  return null;
}

/**
 * Sends a push notification if permitted
 */
export async function sendPushNotification(options) {
  // Check if notifications are supported
  if (!('Notification' in window)) return;

  // Check user preferences
  const user = await base44.auth.me();
  const prefs = user?.notification_preferences || {};
  
  if (prefs[options.data?.type] === false) return; // User disabled this type

  // Check permission
  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      registration.showNotification(options.title, {
        body: options.body,
        icon: '/notification-icon.png',
        badge: options.badge || '/notification-badge.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Abrir',
            icon: '/open-icon.png'
          },
          {
            action: 'close',
            title: 'Cerrar',
            icon: '/close-icon.png'
          }
        ]
      });
    }
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}