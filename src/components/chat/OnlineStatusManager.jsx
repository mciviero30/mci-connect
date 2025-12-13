import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Component to manage user's online status
 * Updates presence in real-time
 */
export default function OnlineStatusManager({ userEmail }) {
  const intervalRef = useRef(null);
  const visibilityRef = useRef(true);

  useEffect(() => {
    if (!userEmail) return;

    // Update presence every 30 seconds
    const updatePresence = async () => {
      if (!visibilityRef.current) return;
      
      try {
        // Find or create user presence record
        const existing = await base44.entities.User.filter({ email: userEmail });
        if (existing.length > 0) {
          await base44.auth.updateMe({
            last_seen: new Date().toISOString(),
            is_online: true
          });
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Initial update
    updatePresence();

    // Set interval for updates
    intervalRef.current = setInterval(updatePresence, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden;
      if (visibilityRef.current) {
        updatePresence();
      }
    };

    // Handle before unload (set offline)
    const handleBeforeUnload = async () => {
      try {
        await base44.auth.updateMe({ is_online: false });
      } catch (error) {
        // Ignore errors on unload
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline on unmount
      base44.auth.updateMe({ is_online: false }).catch(() => {});
    };
  }, [userEmail]);

  return null; // This component doesn't render anything
}