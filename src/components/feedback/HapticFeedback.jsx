/**
 * HAPTIC FEEDBACK SYSTEM
 * Confirmación táctil inmediata para acciones críticas
 * 
 * Intensidades:
 * - light (10ms): acciones frecuentes (tap, select)
 * - medium (50ms): confirmaciones (save, create)
 * - heavy (100ms): errores o acciones irreversibles
 */

export const haptic = {
  // Light tap - acciones frecuentes
  light: () => {
    if (navigator.vibrate) navigator.vibrate(10);
  },
  
  // Medium - confirmaciones estándar
  medium: () => {
    if (navigator.vibrate) navigator.vibrate(50);
  },
  
  // Heavy - errores o acciones críticas
  heavy: () => {
    if (navigator.vibrate) navigator.vibrate(100);
  },
  
  // Success pattern - confirmación exitosa
  success: () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
  },
  
  // Error pattern - algo falló
  error: () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10, 50, 10]);
  },
  
  // Notification - alerta sutil
  notification: () => {
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  },
  
  // Double tap - acción especial
  doubleTap: () => {
    if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
  },
};

// React hook for haptic feedback
export const useHaptic = () => {
  return haptic;
};

// HOC for adding haptics to any component
export const withHaptic = (Component, intensity = 'light') => {
  return (props) => {
    const handleClick = (e) => {
      haptic[intensity]?.();
      props.onClick?.(e);
    };
    
    return <Component {...props} onClick={handleClick} />;
  };
};