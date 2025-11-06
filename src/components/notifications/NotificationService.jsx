import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationCenter from './NotificationCenter';

// Request notification permission on component mount
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
  return Notification.permission === 'granted';
};

// Send browser push notification
const sendBrowserNotification = (title, message, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png',
      badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png',
      vibrate: [200, 100, 200],
      requireInteraction: options.priority === 'urgent',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      if (options.action_url) {
        window.location.href = options.action_url;
      }
      notification.close();
    };

    return notification;
  }
  return null;
};

// Notification service hook
export const useNotificationService = (user) => {
  const queryClient = useQueryClient();
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request permission on mount
  useEffect(() => {
    if (user) {
      requestNotificationPermission().then(setPermissionGranted);
    }
  }, [user]);

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData) => {
      return await base44.entities.Notification.create(notificationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Send notification function
  const sendNotification = async ({
    recipientEmail,
    recipientName,
    type,
    priority = 'medium',
    title,
    message,
    actionUrl,
    relatedEntityType,
    relatedEntityId,
    sendEmail = false
  }) => {
    // Create notification in database
    const notificationData = {
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      type,
      priority,
      title,
      message,
      action_url: actionUrl,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      sent_via_push: permissionGranted,
      sent_via_email: sendEmail
    };

    await createNotificationMutation.mutateAsync(notificationData);

    // Send browser push notification if recipient is current user
    if (user && recipientEmail === user.email && permissionGranted) {
      sendBrowserNotification(title, message, {
        priority,
        action_url: actionUrl,
        tag: `${type}-${relatedEntityId || Date.now()}`
      });
    }

    // Send email notification if requested
    if (sendEmail && priority === 'urgent') {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `🚨 ${title}`,
          body: `${message}\n\nOpen MCI Connect to take action: ${window.location.origin}${actionUrl || ''}`,
          from_name: 'MCI Connect Alerts'
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }
  };

  return { sendNotification, permissionGranted };
};

// Notification Service Component
export default function NotificationService({ children, user }) {
  const [showCenter, setShowCenter] = useState(false);
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Notification.filter({ 
        recipient_email: user.email 
      }, '-created_date', 100);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    initialData: []
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {children}
      
      {/* Floating notification button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowCenter(!showCenter)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-[#3B9FF3] to-blue-500 shadow-lg hover:shadow-xl transition-all"
          size="icon"
        >
          <Bell className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification Center */}
      {showCenter && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowCenter(false)}
          user={user}
        />
      )}
    </>
  );
}