/**
 * Enhanced Geolocation with Progressive Fallback
 * Implements multi-tier strategy for reliable GPS acquisition
 */

export const getLocationWithFallback = async (language = 'en', options = {}) => {
  const {
    onProgress = null,
    useCachedIfAvailable = true,
    maxRetries = 3,
    timeout = 10000
  } = options;

  // TIER 1: Try cached pre-warmed location (instant)
  if (useCachedIfAvailable) {
    try {
      const cached = sessionStorage.getItem('gps_prewarmed_location');
      if (cached) {
        const location = JSON.parse(cached);
        const age = Date.now() - location.timestamp;
        
        if (age < 30000 && location.accuracy <= 100) {
          onProgress?.('cached', language === 'es' ? 'Usando ubicación reciente' : 'Using recent location');
          return {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
            source: 'cached'
          };
        }
      }
    } catch (e) {
      console.log('[GPS Cache] Failed to read:', e);
    }
  }

  // TIER 2: High-accuracy GPS with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.('acquiring', language === 'es' 
        ? `Adquiriendo GPS... (intento ${attempt}/${maxRetries})` 
        : `Acquiring GPS... (attempt ${attempt}/${maxRetries})`);

      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('GPS timeout'));
        }, timeout);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: timeout - 1000,
            maximumAge: 0
          }
        );
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'live'
      };

      // Check accuracy threshold
      if (position.coords.accuracy <= 100) {
        onProgress?.('success', language === 'es' ? '✓ GPS listo' : '✓ GPS ready');
        
        // Cache for future use
        sessionStorage.setItem('gps_prewarmed_location', JSON.stringify({
          ...location,
          timestamp: position.timestamp
        }));
        
        return location;
      } else if (attempt === maxRetries) {
        // Last attempt - accept even if accuracy is poor
        onProgress?.('warning', language === 'es' 
          ? `⚠️ Precisión baja (±${Math.round(position.coords.accuracy)}m)` 
          : `⚠️ Low accuracy (±${Math.round(position.coords.accuracy)}m)`);
        return location;
      }
      
      // Try again for better accuracy
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      if (attempt === maxRetries) {
        // All retries failed
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  throw new Error(language === 'es' ? 'No se pudo obtener ubicación GPS' : 'Could not obtain GPS location');
};

/**
 * Quick distance check (uses cached location if available)
 */
export const quickDistanceCheck = async (targetLat, targetLng, language = 'en') => {
  // Import SSOT distance calculation
  const { calculateDistance } = await import('@/components/utils/geolocation');
  
  try {
    const location = await getLocationWithFallback(language, {
      useCachedIfAvailable: true,
      maxRetries: 1,
      timeout: 5000
    });

    const distance = calculateDistance(
      location.lat,
      location.lng,
      targetLat,
      targetLng
    );

    return {
      distance,
      accuracy: location.accuracy,
      source: location.source
    };
  } catch (error) {
    throw error;
  }
};