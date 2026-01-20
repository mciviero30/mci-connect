import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function ProfileSyncManager({ user }) {
  console.log('[ProfileSyncManager] USER PROP:', user);
  const queryClient = useQueryClient();
  const userRef = useRef(user);

  // Keep ref updated
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    console.log('[ProfileSyncManager useEffect 1] user:', user);
    if (!user) return;

    // Listen for storage events from other tabs/windows
    const handleStorageChange = async (e) => {
      if (e.key === 'profile_updated' || e.key === 'user_profile_updated') {
        console.log('🔄 Profile update detected from another tab, fetching fresh data...');
        // Fetch fresh user data and update cache directly (NO INVALIDATION)
        try {
          const freshUser = await base44.auth.me();
          queryClient.setQueryData(CURRENT_USER_QUERY_KEY, freshUser);
        } catch (err) {
          console.warn('Failed to refresh user:', err);
        }
      }
    };

    // Listen for custom profile update events (same tab)
    const handleProfileUpdate = async (e) => {
      console.log('🔄 Profile update event received, fetching fresh data...');
      // Use ref to avoid stale closure
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      // Fetch fresh user data and update cache directly (NO INVALIDATION)
      try {
        const freshUser = await base44.auth.me();
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, freshUser);
      } catch (err) {
        console.warn('Failed to refresh user:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Broadcast initial user data to localStorage for cross-tab sync
    if (user?.profile_last_updated) {
      localStorage.setItem('profile_timestamp', user.profile_last_updated);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, queryClient]);

  // FIRST LOGIN MIGRATION: Background sync (non-blocking)
  useEffect(() => {
    console.log('[ProfileSyncManager useEffect 2] user:', user);
    if (!user?.id) return;

    // Check if first login (no onboarding_completed flag)
    const isFirstLogin = !sessionStorage.getItem(`first_login_migrated_${user.id}`);
    
    if (isFirstLogin) {
      // Mark immediately to prevent duplicate calls
      sessionStorage.setItem(`first_login_migrated_${user.id}`, 'processing');
      
      // Background migration (fire and forget)
      base44.functions.invoke('syncEmployeeFromPendingOnLogin').then(async () => {
        sessionStorage.setItem(`first_login_migrated_${user.id}`, 'done');
        // Fetch fresh user data and update cache directly (NO INVALIDATION)
        try {
          const freshUser = await base44.auth.me();
          queryClient.setQueryData(CURRENT_USER_QUERY_KEY, freshUser);
        } catch (err) {
          console.warn('Failed to refresh user after migration:', err);
        }
      }).catch(err => {
        console.warn('⚠️ Background migration failed:', err);
        sessionStorage.setItem(`first_login_migrated_${user.id}`, 'failed');
      });
    }
  }, [user?.id, queryClient]);

  // Sync with MCI Web when profile updates (background)
  useEffect(() => {
    console.log('[ProfileSyncManager useEffect 3] user:', user);
    if (!user) return;

    const handleProfileUpdateForSync = () => {
      // Use ref to avoid stale closure
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      // Fire and forget - async sync
      base44.functions.invoke('syncUserProfile', {
        userId: currentUser.id,
        userData: {
          email: currentUser.email,
          full_name: currentUser.full_name,
          profile_photo_url: currentUser.profile_photo_url,
          avatar_image_url: currentUser.avatar_image_url,
          preferred_profile_image: currentUser.preferred_profile_image,
        }
      }).catch(() => {
        // Silent fail - don't block UI
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdateForSync);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdateForSync);
    };
  }, [user?.id]);

  return null;
}