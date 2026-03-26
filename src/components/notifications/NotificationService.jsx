import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NotificationCenter from './NotificationCenter';
import { createNotification, sendEmailNotification } from './notificationHelpers';

// Hook para gestionar el servicio de notificaciones
export function useNotificationService() {
  const queryClient = useQueryClient();

  // Crear notificación
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData) => {
      const notification = await base44.entities.Notification.create(notificationData);
      
      // Si debe enviarse por email, enviar
      if (notificationData.sendEmail) {
        await sendEmailNotification(notification);
        await base44.entities.Notification.update(notification.id, {
          sent_via_email: true,
          email_sent_date: new Date().toISOString()
        });
      }
      
      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // sendNotification is an alias for createNotification
  // (used by LiveTimeTracker, AssignmentForm, etc.)
  const sendNotification = async (data) => {
    try {
      return await createNotificationMutation.mutateAsync({
        recipient_email: data.recipientEmail || data.recipient_email,
        recipient_name: data.recipientName || data.recipient_name,
        type: data.type || 'general',
        title: data.title || '',
        message: data.message || '',
        priority: data.priority || 'normal',
        status: 'unread',
        action_url: data.actionUrl || data.action_url,
        related_entity_type: data.relatedEntityType || data.related_entity_type,
        send_email: data.sendEmail || false,
      });
    } catch (e) {
      // Non-blocking — notification failures should never crash the app
      console.warn('[NotificationService] sendNotification failed (non-fatal):', e?.message);
    }
  };

  return {
    createNotification: createNotificationMutation.mutate,
    sendNotification,
    isCreating: createNotificationMutation.isPending
  };
}

// Componente principal del servicio
export default function NotificationService({ user, children }) {
  const [showCenter, setShowCenter] = useState(false);
  const queryClient = useQueryClient();

  // Obtener notificaciones del usuario
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.Notification.filter(
        { recipient_email: user.email },
        '-created_date',
        50
      );
      return results;
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Marcar notificación como leída
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => 
          base44.entities.Notification.update(n.id, {
            is_read: true,
            read_date: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Eliminar notificación
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // No floating bell button - notifications accessible via sidebar menu
  return <>{children}</>;
}