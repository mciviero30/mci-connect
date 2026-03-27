import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { NotificationIcon } from './NotificationBadges';
import { formatDistanceToNow } from 'date-fns';

export default function RealTimeNotifications({ userEmail }) {
  const [toastNotifications, setToastNotifications] = useState([]);
  const queryClient = useQueryClient();
  const [lastCheck, setLastCheck] = useState(new Date().toISOString());

  // Poll for new notifications every 15 seconds for real-time feel
  const { data: newNotifications = [] } = useQuery({
    queryKey: ['newNotifications', userEmail, lastCheck],
    queryFn: async () => {
      if (!userEmail) return [];
      const notifications = await base44.entities.Notification.filter({
        recipient_email: userEmail,
        created_date: { $gte: lastCheck },
        is_read: false
      }, '-created_date');
      return notifications;
    },
    enabled: !!userEmail,
    refetchInterval: 15000, // Poll every 15 seconds for better real-time
    staleTime: 30000,
  });

  useEffect(() => {
    if (newNotifications.length > 0) {
      // Add new notifications to toast
      const newToasts = newNotifications.map(n => ({
        id: n.id,
        ...n,
        timestamp: Date.now()
      }));
      
      setToastNotifications(prev => [...newToasts, ...prev].slice(0, 5)); // Keep max 5
      setLastCheck(new Date().toISOString());
      
      // Invalidate notifications query to update badge
      queryClient.invalidateQueries(['notifications']);
    }
  }, [newNotifications.length]);

  const removeToast = (id) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Only show toast notifications if there are any - no floating bell icon
  if (toastNotifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9998] space-y-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toastNotifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="pointer-events-auto"
          >
            <div className="bg-white dark:bg-[#282828] border-2 border-blue-300 dark:border-blue-600 rounded-xl shadow-2xl p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                  </span>
                </div>
                <button
                  onClick={() => removeToast(notification.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}