import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Sincroniza fotos de perfil y datos de empleados entre MCI Connect y MCI Web
 * Se ejecuta cuando el usuario actualiza su perfil
 */
export default function CrossAppProfileSync({ user }) {
  const queryClient = useQueryClient();
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    if (!user || syncInProgressRef.current) return;

    const syncProfileToMCIWeb = async () => {
      try {
        syncInProgressRef.current = true;

        // Sincronizar perfil a MCI Web
        await base44.functions.invoke('syncProfileToMCIWeb', {
          email: user.email,
          full_name: user.full_name,
          profile_photo_url: user.profile_photo_url,
          avatar_image_url: user.avatar_image_url,
          preferred_profile_image: user.preferred_profile_image,
          phone: user.phone,
          position: user.position,
          department: user.department,
          profile_last_updated: user.profile_last_updated || new Date().toISOString()
        });

        console.log('✅ Perfil sincronizado con MCI Web');
      } catch (error) {
        console.error('❌ Error sincronizando perfil a MCI Web:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Escuchar eventos de actualización de perfil
    const handleProfileUpdate = () => {
      syncProfileToMCIWeb();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Sincronización inicial si es necesario
    const lastSync = localStorage.getItem(`last_sync_${user.email}`);
    const profileTimestamp = user.profile_last_updated || user.updated_date;
    
    if (!lastSync || (profileTimestamp && profileTimestamp > lastSync)) {
      syncProfileToMCIWeb();
      localStorage.setItem(`last_sync_${user.email}`, new Date().toISOString());
    }

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.email, user?.profile_last_updated, user?.profile_photo_url, user?.avatar_image_url]);

  return null;
}