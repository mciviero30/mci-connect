import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPendingCount, syncMutations } from './mutationQueue';
import OfflineIndicator from './OfflineIndicator';

const OfflineContext = createContext();

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    retry: false,
  });

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // CRITICAL: Enhanced notification sending with user preferences
  const sendNotification = async (type, title, message, priority = 'medium') => {
    if (!user) return;

    // Check if user has notification preferences and if this type is enabled
    const prefs = user.notification_preferences || {};
    
    // If notifications are globally disabled, don't send
    if (prefs.enabled === false) return;
    
    // If urgent_only mode is on, only send urgent notifications
    if (prefs.urgent_only && priority !== 'urgent') return;
    
    // Check type-specific preferences
    const typeMap = {
      sync_complete: prefs.sync_complete,
      sync_failed: prefs.sync_failed,
    };
    
    // If this notification type is explicitly disabled, don't send
    if (typeMap[type] === false) return;

    try {
      // Create notification record
      await base44.entities.Notification.create({
        recipient_email: user.email,
        recipient_name: user.full_name,
        type,
        priority,
        title,
        message,
        sent_via_push: true
      });

      // Send browser notification if supported and granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/logo.png',
          badge: '/logo.png'
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      const count = await getPendingCount();
      if (count > 0 && !isSyncing) {
        setIsSyncing(true);
        try {
          const result = await syncMutations();
          
          if (result.synced > 0) {
            await sendNotification(
              'sync_complete',
              '✅ Back Online - Sync Complete',
              `${result.synced} changes synced successfully`,
              'medium'
            );
          }
          
          if (result.failed > 0) {
            await sendNotification(
              'sync_failed',
              '⚠️ Sync Issues',
              `${result.failed} changes failed to sync. Please review.`,
              'high'
            );
          }
        } catch (error) {
          await sendNotification(
            'sync_failed',
            '❌ Sync Failed',
            'Unable to sync offline changes. Please try manually.',
            'urgent'
          );
        } finally {
          setIsSyncing(false);
          const newCount = await getPendingCount();
          setPendingCount(newCount);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSyncing, user]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing }}>
      {/* REMOVED: OfflineIndicator - user doesn't want it visible */}
      {children}
    </OfflineContext.Provider>
  );
};