import { useEffect } from 'react';

/**
 * Handles mobile keyboard interactions to prevent layout jumps
 * Particularly important for Android devices
 */
export default function MobileKeyboardHandler() {
  useEffect(() => {
    const isAndroid = /Android/.test(navigator.userAgent);
    if (!isAndroid) return;

    let originalHeight = window.visualViewport?.height || window.innerHeight;
    let keyboardOpen = false;

    const handleViewportResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = originalHeight - currentHeight;

      if (heightDiff > 150) {
        // Keyboard opened
        if (!keyboardOpen) {
          keyboardOpen = true;
          document.body.classList.add('keyboard-open');
          
          // Scroll active input into view
          const activeElement = document.activeElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
              activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }
      } else {
        // Keyboard closed
        if (keyboardOpen) {
          keyboardOpen = false;
          document.body.classList.remove('keyboard-open');
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      return () => window.visualViewport.removeEventListener('resize', handleViewportResize);
    } else {
      window.addEventListener('resize', handleViewportResize);
      return () => window.removeEventListener('resize', handleViewportResize);
    }
  }, []);

  return null;
}