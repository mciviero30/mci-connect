import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  MapPin, 
  Clock, 
  Calendar,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationIcon = ({ type, priority }) => {
  const iconClass = priority === 'urgent' ? 'text-red-500' : 
                    priority === 'high' ? 'text-orange-500' :
                    priority === 'medium' ? 'text-yellow-500' : 'text-blue-500';

  switch (type) {
    case 'geofence_entry':
    case 'geofence_exit':
      return <MapPin className={`w-5 h-5 ${iconClass}`} />;
    case 'time_exceeded':
    case 'clock_open':
      return <Clock className={`w-5 h-5 ${iconClass}`} />;
    case 'schedule_update':
    case 'assignment_new':
      return <Calendar className={`w-5 h-5 ${iconClass}`} />;
    case 'approval_required':
      return <AlertTriangle className={`w-5 h-5 ${iconClass}`} />;
    default:
      return <Info className={`w-5 h-5 ${iconClass}`} />;
  }
};

export default function NotificationCenter({ notifications, onClose, user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, unread, urgent

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => base44.entities.Notification.update(n.id, {
          is_read: true,
          read_date: new Date().toISOString()
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high';
    return true;
  });

  const priorityColors = {
    urgent: 'border-l-4 border-l-red-500 bg-red-50',
    high: 'border-l-4 border-l-orange-500 bg-orange-50',
    medium: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    low: 'border-l-4 border-l-blue-500 bg-blue-50'
  };

  return (
    <Card className="fixed bottom-24 right-6 w-96 h-[600px] bg-white shadow-2xl border-slate-200 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#3B9FF3] to-blue-500">
        <h3 className="font-bold text-white text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            className="text-white hover:bg-white/20"
            disabled={notifications.filter(n => !n.is_read).length === 0}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-slate-200 flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-[#3B9FF3]' : ''}
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'bg-[#3B9FF3]' : ''}
        >
          Unread ({notifications.filter(n => !n.is_read).length})
        </Button>
        <Button
          variant={filter === 'urgent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('urgent')}
          className={filter === 'urgent' ? 'bg-red-500' : ''}
        >
          Urgent
        </Button>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1 p-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Info className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  priorityColors[notification.priority]
                } ${!notification.is_read ? 'opacity-100' : 'opacity-60'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <NotificationIcon type={notification.type} priority={notification.priority} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 mb-1">
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-700 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {format(new Date(notification.created_date), 'MMM dd, HH:mm')}
                      </span>
                      
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}