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

  return {
    createNotification: createNotificationMutation.mutate,
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

  return (
    <>
      {children}
      
      {/* Botón flotante de notificaciones */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowCenter(!showCenter)}
          size="lg"
          className="relative bg-gradient-to-r from-[#3B9FF3] to-blue-600 hover:from-[#2d8fe0] hover:to-blue-700 text-white shadow-2xl shadow-blue-500/30 rounded-full w-14 h-14 p-0"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Centro de notificaciones */}
      {showCenter && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowCenter(false)}
          onMarkAsRead={markAsReadMutation.mutate}
          onMarkAllAsRead={markAllAsReadMutation.mutate}
          onDelete={deleteNotificationMutation.mutate}
        />
      )}
    </>
  );
}