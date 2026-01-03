import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useEmployeeProfile from '@/components/hooks/useEmployeeProfile';

export default function ProfileSyncManager({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Listen for storage events from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'profile_updated' || e.key === 'user_profile_updated') {
        console.log('🔄 Profile update detected from another tab, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.refetchQueries({ queryKey: ['currentUser'] });
      }
    };

    // Listen for custom profile update events (same tab)
    const handleProfileUpdate = (e) => {
      console.log('🔄 Profile update event received, refreshing...');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.refetchQueries({ queryKey: ['currentUser'] });
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
  }, [user?.profile_last_updated, queryClient]);

  // Poll for changes if we detect the user object has a profile_last_updated field
  useEffect(() => {
    if (!user?.profile_last_updated) return;

    const checkForUpdates = setInterval(() => {
      const storedTimestamp = localStorage.getItem('profile_timestamp');
      if (storedTimestamp && storedTimestamp !== user.profile_last_updated) {
        console.log('🔄 Profile timestamp mismatch detected, refreshing...');
        queryClient.refetchQueries({ queryKey: ['currentUser'] });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkForUpdates);
  }, [user?.profile_last_updated, queryClient]);

  // Sync with MCI Web when profile updates
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
        console.log('✅ Profile synced with MCI Web');
      } catch (error) {
        console.warn('⚠️ Could not sync with MCI Web:', error);
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