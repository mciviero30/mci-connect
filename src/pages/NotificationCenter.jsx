import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { NotificationIcon, PriorityBadge } from '../components/notifications/NotificationBadges';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import PushNotificationManager from '../components/notifications/PushNotificationManager';
import { Link } from 'react-router-dom';

export default function NotificationCenter() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Notification.filter(
        { recipient_email: user.email },
        '-created_date',
        100
      );
    },
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, {
      is_read: true,
      read_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, {
          is_read: true,
          read_date: new Date().toISOString()
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notification deleted');
    }
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Notification Center"
          description="Manage all your alerts and notifications"
          icon={Bell}
          stats={[
            { label: 'Unread', value: unreadCount }
          ]}
          actions={
            unreadCount > 0 && (
              <Button 
                onClick={() => markAllAsReadMutation.mutate()}
                variant="outline"
                className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )
          }
        />

        {/* Push Notifications Manager */}
        {user && (
          <div className="mb-6">
            <PushNotificationManager user={user} />
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white">All</SelectItem>
                  <SelectItem value="unread" className="text-slate-900 dark:text-white">Unread</SelectItem>
                  <SelectItem value="read" className="text-slate-900 dark:text-white">Read</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-52 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white">All Types</SelectItem>
                  <SelectItem value="system_alert" className="text-slate-900 dark:text-white">System Alerts</SelectItem>
                  <SelectItem value="overtime_alert" className="text-slate-900 dark:text-white">Overtime Alerts</SelectItem>
                  <SelectItem value="invoice_overdue" className="text-slate-900 dark:text-white">Overdue Invoices</SelectItem>
                  <SelectItem value="invoice_due_soon" className="text-slate-900 dark:text-white">Upcoming Invoices</SelectItem>
                  <SelectItem value="certification_expiring" className="text-slate-900 dark:text-white">Certification Expiring</SelectItem>
                  <SelectItem value="performance_review_due" className="text-slate-900 dark:text-white">Performance Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map(notification => (
              <Card 
                key={notification.id} 
                className={`bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <NotificationIcon type={notification.type} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <PriorityBadge priority={notification.priority} />
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          {formatDistanceToNow(new Date(notification.created_date), {
                            addSuffix: true,
                            locale: language === 'es' ? es : undefined
                          })}
                        </span>

                        <div className="flex gap-2">
                          {notification.action_url && (
                            <Link to={notification.action_url}>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-xs border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                View
                              </Button>
                            </Link>
                          )}
                          
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              className="text-xs border-green-300 dark:border-green-600 text-green-600 dark:text-green-400"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            className="text-xs border-red-300 dark:border-red-600 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}