
/**
 * Prompt #85: Offline Manager - Main orchestrator
 * Handles network detection, initialization, and coordination
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncPendingMutations } from './mutationQueue';
import OfflineIndicator from './OfflineIndicator';
import { base44 } from '@/api/base44Client';

const OfflineContext = createContext({ isOnline: true, pendingCount: 0 });

export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // NEW: Get current user for notifications
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Load current user
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  // NEW: Send notification helper
  const sendNotification = async (title, message, type = 'info', priority = 'medium') => {
    if (!currentUser) return;

    const prefs = currentUser.notification_preferences || {};
    
    // Check if notifications are enabled
    if (!prefs.enabled) return;
    
    // Check if urgent only mode is on and this is not urgent
    if (prefs.urgent_only && priority !== 'urgent') return;

    // Check specific preference
    if (type === 'sync_complete' && !prefs.sync_complete) return;
    if (type === 'sync_failed' && !prefs.sync_failed) return;

    try {
      // Create notification in database
      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        recipient_name: currentUser.full_name,
        type: type === 'sync_complete' || type === 'sync_failed' ? 'system_alert' : type,
        priority,
        title,
        message,
        sent_via_push: false
      });

      // Send browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png',
          badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png',
          vibrate: [200, 100, 200],
          tag: `${type}-${Date.now()}`
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  useEffect(() => {
    // Update pending count from localStorage
    const updatePendingCount = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('mutation_queue') || '[]');
        setPendingCount(queue.length);
      } catch {
        setPendingCount(0);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Back online - starting sync...');
      setIsOnline(true);
      setIsSyncing(true);

      try {
        const syncedCount = await syncPendingMutations(queryClient);
        
        if (syncedCount > 0) {
          console.log(`✅ Synced ${syncedCount} operations successfully`);
          
          // NEW: Send success notification
          await sendNotification(
            '✅ Sync Complete!',
            `Successfully synced ${syncedCount} pending ${syncedCount === 1 ? 'operation' : 'operations'}.`,
            'sync_complete',
            'medium'
          );
        }
      } catch (error) {
        console.error('❌ Sync failed:', error);
        
        // NEW: Send failure notification
        await sendNotification(
          '❌ Sync Failed',
          'Some operations could not be synced. Please check your connection and try again.',
          'sync_failed',
          'high'
        );
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      console.log('📡 Connection lost - entering offline mode');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (navigator.onLine && pendingCount > 0) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, pendingCount, currentUser]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing }}>
      <OfflineIndicator />
      {children}
    </OfflineContext.Provider>
  );
}
