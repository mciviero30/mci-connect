import { useEffect } from 'react';

/**
 * Platform-specific mobile optimizations for iOS and Android
 */
export default function MobileNativeOptimizations() {
  useEffect(() => {
    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    if (!isMobile) return;

    // iOS Specific Optimizations
    if (isIOS) {
      // Prevent elastic scrolling at document level
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      
      // Let only specific containers scroll
      document.querySelectorAll('[data-scrollable="true"]').forEach(el => {
        el.style.webkitOverflowScrolling = 'touch';
        el.style.overflowY = 'auto';
      });

      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      const preventDoubleTapZoom = (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

      // Handle orientation changes without reload
      const handleOrientationChange = () => {
        // Force recalculation of viewport height
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      };
      window.addEventListener('orientationchange', handleOrientationChange);

      return () => {
        document.removeEventListener('touchend', preventDoubleTapZoom);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    }

    // Android Specific Optimizations
    if (isAndroid) {
      // Prevent text selection on long press for non-input elements
      document.addEventListener('selectstart', (e) => {
        const target = e.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      });

      // Stable viewport on keyboard open/close
      const originalHeight = window.innerHeight;
      const handleResize = () => {
        // If height decreased significantly, keyboard is open
        const currentHeight = window.innerHeight;
        if (originalHeight - currentHeight > 150) {
          // Keyboard open - prevent layout shift
          document.body.style.height = `${originalHeight}px`;
        } else {
          // Keyboard closed - restore
          document.body.style.height = '100%';
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle app resume from background (both platforms)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App resumed - trigger a gentle re-render without full reload
        document.body.classList.add('app-resumed');
        setTimeout(() => {
          document.body.classList.remove('app-resumed');
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Prevent accidental refresh on pull-down
  useEffect(() => {
    let startY = 0;
    
    const handleTouchStart = (e) => {
      startY = e.touches[0].pageY;
    };
    
    const handleTouchMove = (e) => {
      const y = e.touches[0].pageY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      // If at top and pulling down, prevent default
      if (scrollTop === 0 && y > startY) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return null; // No UI, just effects
}