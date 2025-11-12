import React, { useState } from 'react';
import { X, Check, CheckCheck, Trash2, Bell, Calendar, Users, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const notificationIcons = {
  project_invitation: Users,
  project_member_added: Users,
  task_assigned: FileText,
  task_status_changed: FileText,
  task_due_soon: Calendar,
  task_overdue: AlertCircle,
  access_request_pending: Users,
  access_request_approved: Check,
  access_request_rejected: X,
  comment_mention: Bell,
  file_uploaded: FileText,
  milestone_completed: CheckCheck,
  system_alert: AlertCircle
};

const priorityColors = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500'
};

export default function NotificationCenter({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDelete 
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, unread, read

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Bell className="w-6 h-6 text-[#3B9FF3]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <p className="text-sm text-slate-400">
                  {unreadCount} unread
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#3B9FF3] text-white' : 'border-slate-600 text-slate-300'}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-[#3B9FF3] text-white' : 'border-slate-600 text-slate-300'}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('read')}
              className={filter === 'read' ? 'bg-[#3B9FF3] text-white' : 'border-slate-600 text-slate-300'}
            >
              Read ({notifications.length - unreadCount})
            </Button>
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="w-full mt-3 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No notifications</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                      notification.is_read
                        ? 'bg-slate-800/30 border-slate-700/50'
                        : 'bg-slate-800/60 border-[#3B9FF3]/30 shadow-lg shadow-blue-500/5'
                    } hover:bg-slate-800/80 hover:border-[#3B9FF3]/50`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        notification.is_read ? 'bg-slate-700/50' : 'bg-blue-500/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          notification.is_read ? 'text-slate-400' : 'text-[#3B9FF3]'
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold text-sm ${
                            notification.is_read ? 'text-slate-300' : 'text-white'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-[#3B9FF3] flex-shrink-0 mt-1" />
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">
                            {format(new Date(notification.created_date), 'MMM d, h:mm a', { locale: es })}
                          </span>
                          
                          {notification.priority !== 'medium' && (
                            <Badge className={`${priorityColors[notification.priority]} text-white text-xs px-2 py-0`}>
                              {notification.priority}
                            </Badge>
                          )}

                          {notification.sent_via_email && (
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              📧 Emailed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}