/**
 * GEOLOCATION UTILITIES - Single Source of Truth
 * Shared geofencing calculations across the app
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Get current device location with high accuracy
 * @param {string} language - 'en' or 'es' for error messages
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export const getCurrentLocation = (language = 'en') => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(language === 'es' ? 'GPS no soportado por tu dispositivo' : 'Geolocation not supported');
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Check for low accuracy (possible mock location)
        if (pos.coords.accuracy > 100) {
          return reject(language === 'es' 
            ? '⚠️ Precisión GPS muy baja. Asegúrate de estar al aire libre y tener señal GPS fuerte.' 
            : '⚠️ GPS accuracy too low. Make sure you are outdoors with strong GPS signal.');
        }
        
        resolve({ 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        if (err.code === 1) {
          return reject(language === 'es' 
            ? '❌ Permiso de ubicación denegado. Debes habilitar GPS para fichar.' 
            : '❌ Location permission denied. You must enable GPS to clock in.');
        } else if (err.code === 2) {
          return reject(language === 'es' 
            ? '❌ GPS no disponible. Verifica que el GPS esté activado.' 
            : '❌ GPS unavailable. Check that GPS is enabled.');
        } else {
          return reject(language === 'es' 
            ? '❌ Error obteniendo ubicación. Intenta de nuevo.' 
            : '❌ Error getting location. Try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Don't use cached location
      }
    );
  });
};