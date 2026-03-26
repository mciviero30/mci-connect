/**
 * Geolocation Permissions Helper
 * Pre-check GPS permissions before critical actions
 * 
 * GEOFENCE HARDENING PASO 3
 */

/**
 * Check geolocation permission status
 * Returns: 'granted' | 'prompt' | 'denied' | 'unavailable'
 */
export async function checkGeolocationPermission() {
  // Check if geolocation is available
  if (!navigator.geolocation) {
    return 'unavailable';
  }

  // Check if Permissions API is available (not in all browsers)
  if (!navigator.permissions || !navigator.permissions.query) {
    // Fallback: assume prompt state (browser will ask)
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'prompt', or 'denied'
  } catch (error) {
    // Safari on iOS < 16 doesn't support permissions.query for geolocation
    // Assume prompt state
    return 'prompt';
  }
}

/**
 * Check if user has already been shown the denied prompt in this session
 */
export function hasSeenDeniedPrompt() {
  return sessionStorage.getItem('geolocation_denied_seen') === 'true';
}

/**
 * Mark that user has seen the denied prompt
 */
export function markDeniedPromptSeen() {
  sessionStorage.setItem('geolocation_denied_seen', 'true');
}

/**
 * Clear the denied prompt flag (for new session)
 */
export function clearDeniedPromptFlag() {
  sessionStorage.removeItem('geolocation_denied_seen');
}

/**
 * Detect platform for instructions
 * Returns: 'ios' | 'android' | 'desktop'
 */
export function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Get platform-specific instructions for enabling GPS
 */
export function getGPSInstructions(language = 'en') {
  const platform = detectPlatform();
  
  const instructions = {
    ios: {
      en: [
        'Open Settings on your iPhone',
        'Scroll down and tap Safari (or your browser)',
        'Tap Location',
        'Select "While Using the App" or "Always"',
        'Return to this page and try again'
      ],
      es: [
        'Abre Configuración en tu iPhone',
        'Desplázate y toca Safari (o tu navegador)',
        'Toca Ubicación',
        'Selecciona "Mientras usas la app" o "Siempre"',
        'Vuelve a esta página e intenta de nuevo'
      ]
    },
    android: {
      en: [
        'Open Settings on your phone',
        'Go to Apps → Browser (Chrome/Firefox)',
        'Tap Permissions',
        'Enable Location',
        'Return to this page and try again'
      ],
      es: [
        'Abre Configuración en tu teléfono',
        'Ve a Apps → Navegador (Chrome/Firefox)',
        'Toca Permisos',
        'Habilita Ubicación',
        'Vuelve a esta página e intenta de nuevo'
      ]
    },
    desktop: {
      en: [
        'Click the location icon in your browser address bar',
        'Select "Allow" for location access',
        'If blocked, go to browser Settings → Privacy → Site Settings',
        'Find this site and enable Location',
        'Refresh the page and try again'
      ],
      es: [
        'Haz clic en el ícono de ubicación en la barra de direcciones',
        'Selecciona "Permitir" para acceso a ubicación',
        'Si está bloqueado, ve a Configuración → Privacidad → Configuración de sitios',
        'Encuentra este sitio y habilita Ubicación',
        'Recarga la página e intenta de nuevo'
      ]
    }
  };

  return instructions[platform][language] || instructions[platform].en;
}