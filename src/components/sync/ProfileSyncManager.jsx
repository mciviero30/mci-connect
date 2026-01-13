import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProfileSyncManager({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Listen for storage events from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'profile_updated' || e.key === 'user_profile_updated') {
        console.log('🔄 Profile update detected from another tab, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    };

    // Listen for custom profile update events (same tab)
    const handleProfileUpdate = (e) => {
      console.log('🔄 Profile update event received, refreshing...');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
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
    if (!user?.id) return;

    // Check if first login (no onboarding_completed flag)
    const isFirstLogin = !sessionStorage.getItem(`first_login_migrated_${user.id}`);
    
    if (isFirstLogin) {
      // Mark immediately to prevent duplicate calls
      sessionStorage.setItem(`first_login_migrated_${user.id}`, 'processing');
      
      // Background migration (fire and forget)
      base44.functions.invoke('syncEmployeeFromPendingOnLogin').then(() => {
        sessionStorage.setItem(`first_login_migrated_${user.id}`, 'done');
        // Refresh user data after migration
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }).catch(err => {
        console.warn('⚠️ Background migration failed:', err);
        sessionStorage.setItem(`first_login_migrated_${user.id}`, 'failed');
      });
    }
  }, [user?.id, queryClient]);

  // Sync with MCI Web when profile updates (background)
  useEffect(() => {
    if (!user) return;

    const syncWithMCIWeb = async () => {
      try {
        await base44.functions.invoke('syncUserProfile', {
          userId: user.id,
          userData: {
            email: user.email,
            full_name: user.full_name,
            profile_photo_url: user.profile_photo_url,
            avatar_image_url: user.avatar_image_url,
            preferred_profile_image: user.preferred_profile_image,
          }
        });
      } catch (error) {
        // Silent fail - don't block UI
      }
    };

    const handleProfileUpdateForSync = () => {
      syncWithMCIWeb();
    };

    window.addEventListener('profileUpdated', handleProfileUpdateForSync);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdateForSync);
    };
  }, [user?.id, user?.profile_last_updated]);

  return null;
}