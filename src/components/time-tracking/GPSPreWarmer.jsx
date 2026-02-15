import { useEffect, useRef } from 'react';

/**
 * GPS Pre-Warmer Hook
 * Warms up GPS before user needs it to reduce clock-in delay
 * Runs in background, stores best location in cache
 */
export function useGPSPreWarmer(enabled = true) {
  const watchIdRef = useRef(null);
  const bestLocationRef = useRef(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    let mounted = true;

    // Start watching GPS in background
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mounted) return;

        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // Keep the most accurate location
        if (!bestLocationRef.current || newLocation.accuracy < bestLocationRef.current.accuracy) {
          bestLocationRef.current = newLocation;
          
          // Cache for instant retrieval
          sessionStorage.setItem('gps_prewarmed_location', JSON.stringify(newLocation));
        }
      },
      (error) => {
        console.log('[GPS PreWarmer] Silent error:', error.code);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept 10s old location
        timeout: 20000
      }
    );

    return () => {
      mounted = false;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);

  return {
    getCachedLocation: () => {
      try {
        const cached = sessionStorage.getItem('gps_prewarmed_location');
        if (!cached) return null;
        
        const location = JSON.parse(cached);
        const age = Date.now() - location.timestamp;
        
        // Use cached location if less than 30 seconds old
        if (age < 30000) {
          return location;
        }
        
        return null;
      } catch {
        return null;
      }
    },
    clearCache: () => {
      sessionStorage.removeItem('gps_prewarmed_location');
      bestLocationRef.current = null;
    }
  };
}

export default useGPSPreWarmer;