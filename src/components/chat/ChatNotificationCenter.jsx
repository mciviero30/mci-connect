import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  AtSign, 
  Users, 
  MessageSquare, 
  Check, 
  CheckCheck,
  X,
  Trash2,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

export default function ChatNotificationCenter({ userEmail, onNavigate }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['chatNotifications', userEmail],
    queryFn: async () => {
      const notifs = await base44.entities.ChatNotification.filter(
        { recipient_email: userEmail, is_dismissed: false },
        '-created_date',
        50
      );
      return notifs;
    },
    enabled: !!userEmail,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.ChatNotification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatNotifications', userEmail] });
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => base44.entities.ChatNotification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatNotifications', userEmail] });
      toast.success('All notifications marked as read');
    }
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.ChatNotification.update(notificationId, { is_dismissed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatNotifications', userEmail] });
    }
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        notifications.map(n => base44.entities.ChatNotification.update(n.id, { is_dismissed: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatNotifications', userEmail] });
      toast.success('All notifications cleared');
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const mentions = notifications.filter(n => n.type === 'mention');
  const groupInvites = notifications.filter(n => n.type === 'group_invite');
  const messages = notifications.filter(n => n.type === 'direct_message' || n.type === 'group_message');

  const getIcon = (type) => {
    switch (type) {
      case 'mention': return <AtSign className="w-4 h-4 text-blue-500" />;
      case 'group_invite': return <Users className="w-4 h-4 text-purple-500" />;
      case 'direct_message': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'group_message': return <Users className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    
    if (onNavigate) {
      onNavigate(notification);
    }
    setOpen(false);
  };

  const NotificationItem = ({ notification }) => (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer group ${
        notification.is_read 
          ? 'bg-white dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50'
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${
              notification.is_read 
                ? 'text-slate-700 dark:text-slate-300' 
                : 'text-slate-900 dark:text-white'
            }`}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            dismissMutation.mutate(notification.id);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative h-9 w-9 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700"
        align="end"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllReadMutation.mutate()}
                  className="h-7 text-xs text-[#3B9FF3]"
                  disabled={markAllReadMutation.isPending}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearAllMutation.mutate()}
                  className="h-7 text-xs text-slate-500 hover:text-red-500"
                  disabled={clearAllMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-slate-200 dark:border-slate-700 bg-transparent h-10 px-2">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#3B9FF3]">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#3B9FF3]">
              <AtSign className="w-3 h-3 mr-1" />
              ({mentions.length})
            </TabsTrigger>
            <TabsTrigger value="invites" className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#3B9FF3]">
              <Users className="w-3 h-3 mr-1" />
              ({groupInvites.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-80">
            <TabsContent value="all" className="p-2 space-y-2 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map(n => <NotificationItem key={n.id} notification={n} />)
              )}
            </TabsContent>

            <TabsContent value="mentions" className="p-2 space-y-2 mt-0">
              {mentions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <AtSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No mentions</p>
                </div>
              ) : (
                mentions.map(n => <NotificationItem key={n.id} notification={n} />)
              )}
            </TabsContent>

            <TabsContent value="invites" className="p-2 space-y-2 mt-0">
              {groupInvites.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No group invites</p>
                </div>
              ) : (
                groupInvites.map(n => <NotificationItem key={n.id} notification={n} />)
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}