import { useEffect } from 'react';

/**
 * Prompt #80: Mobile optimizations + PWA support
 * Component to handle mobile-specific optimizations and Progressive Web App setup
 */
export default function MobileOptimizations() {
  useEffect(() => {
    // Prevent pull-to-refresh ONLY on the body/root element when at the very top
    let startY = 0;
    
    const handleTouchStart = (e) => {
      startY = e.touches[0].pageY;
    };
    
    const handleTouchMove = (e) => {
      // REMOVED: No longer preventing pull-to-refresh
      // Let browser handle scroll naturally
    };
    
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    // Double-tap zoom handled by viewport meta (maximum-scale=1)
    // No need for touch event blocking
    
    // Add viewport meta for mobile (Prompt #80)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      document.head.appendChild(meta);
    }
    
    // PWA: Add apple-mobile-web-app-capable for iOS
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-capable';
      appleMeta.content = 'yes';
      document.head.appendChild(appleMeta);
    }
    
    // PWA: Add apple-mobile-web-app-status-bar-style
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
      appleStatusBar.content = 'default'; // White status bar
      document.head.appendChild(appleStatusBar);
    } else {
      appleStatusBar.content = 'default';
    }
    
    // PWA: Add apple-mobile-web-app-title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.name = 'apple-mobile-web-app-title';
      appleTitle.content = 'MCI Connect';
      document.head.appendChild(appleTitle);
    }
    
    // PWA: Add theme-color meta for browser chrome
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#ffffff';
      document.head.appendChild(themeColor);
    } else {
      themeColor.content = '#ffffff';
    }
    
    // PWA: Add description meta
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      description.content = 'MCI Connect - Complete workforce management system for field service teams';
      document.head.appendChild(description);
    }
    
    // Set background color on body and html
    document.documentElement.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
    
    // Add smooth scrolling CSS for iOS
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      [data-scrollable] {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
      
      html, body {
        background-color: #ffffff !important;
      }
      
      /* PWA: Remove default margins */
      body {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }
      
      /* Optimize touch targets: 56px minimum for easy tapping */
      button, a, [role="button"], input, select, textarea {
        min-height: 56px;
        min-width: 56px;
      }

      /* Reduce motion on slow connections */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Optimize images for mobile - lazy load + async decode */
      img {
        loading: lazy;
        decoding: async;
        -webkit-user-drag: none;
      }

      /* Prevent text selection jank on mobile */
      .no-select {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);
    
    // PWA: Register service worker for offline support (if manifest exists)
    // SAFE: No-op if sw.js doesn't exist
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed or file doesn't exist - that's ok
      });
    }
    
    return () => {
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);
  
  return null;
}