/**
 * Mobile Lifecycle Manager
 * Handles app background/foreground transitions without state loss
 */

class MobileLifecycleManager {
  constructor() {
    this.state = {
      isBackground: false,
      lastForegroundTime: Date.now(),
      lastBackgroundTime: null,
      interruptionCount: 0,
    };
    
    this.listeners = new Map();
    this.stateSnapshots = new Map();
    this.init();
  }

  init() {
    // Visibility change (all platforms)
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    // Page freeze/resume (iOS Safari specific)
    window.addEventListener('freeze', () => this.handleFreeze());
    window.addEventListener('resume', () => this.handleResume());
    
    // Focus/blur (fallback)
    window.addEventListener('focus', () => this.handleFocus());
    window.addEventListener('blur', () => this.handleBlur());
    
    // Page lifecycle events (Chrome/Android)
    document.addEventListener('pagehide', () => this.handlePageHide());
    document.addEventListener('pageshow', () => this.handlePageShow());
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.onBackground();
    } else if (document.visibilityState === 'visible') {
      this.onForeground();
    }
  }

  handleFreeze() {
    console.log('[MobileLifecycle] Page frozen (iOS)');
    this.onBackground();
  }

  handleResume() {
    console.log('[MobileLifecycle] Page resumed (iOS)');
    this.onForeground();
  }

  handleFocus() {
    if (!this.state.isBackground) return;
    console.log('[MobileLifecycle] Window focused');
    this.onForeground();
  }

  handleBlur() {
    if (this.state.isBackground) return;
    console.log('[MobileLifecycle] Window blurred');
    this.onBackground();
  }

  handlePageHide() {
    console.log('[MobileLifecycle] Page hide (Android)');
    this.onBackground();
  }

  handlePageShow() {
    console.log('[MobileLifecycle] Page show (Android)');
    this.onForeground();
  }

  onBackground() {
    if (this.state.isBackground) return;
    
    console.log('[MobileLifecycle] App backgrounded');
    this.state.isBackground = true;
    this.state.lastBackgroundTime = Date.now();
    this.state.interruptionCount++;

    // Take state snapshot
    this.captureStateSnapshot();
    
    // Notify listeners
    this.notifyListeners('background');
  }

  onForeground() {
    if (!this.state.isBackground) return;
    
    const duration = Date.now() - (this.state.lastBackgroundTime || 0);
    console.log(`[MobileLifecycle] App foregrounded (was background for ${Math.round(duration/1000)}s)`);
    
    this.state.isBackground = false;
    this.state.lastForegroundTime = Date.now();

    // Restore state snapshot
    this.restoreStateSnapshot();
    
    // Notify listeners
    this.notifyListeners('foreground', { duration });
  }

  captureStateSnapshot() {
    try {
      // Capture scroll positions using data attributes ONLY
      const scrollElements = document.querySelectorAll('[data-scrollable]');
      scrollElements.forEach((el, index) => {
        // Use data attribute or generate stable index key
        const key = el.getAttribute('data-scroll-id') || `scrollable_${index}`;
        this.stateSnapshots.set(`scroll_${key}`, el.scrollTop);
        // Store reference for restoration
        el.setAttribute('data-scroll-id', key);
      });

      // Capture active element (for form focus restoration)
      if (document.activeElement && document.activeElement.id) {
        this.stateSnapshots.set('activeElement', document.activeElement.id);
      }

      // Mark snapshot in session
      sessionStorage.setItem('field_snapshot_time', Date.now().toString());
      
      console.log('[MobileLifecycle] State snapshot captured');
    } catch (error) {
      console.error('[MobileLifecycle] Failed to capture snapshot:', error);
    }
  }

  restoreStateSnapshot() {
    try {
      // Restore scroll positions using data attributes ONLY
      requestAnimationFrame(() => {
        this.stateSnapshots.forEach((value, key) => {
          if (key.startsWith('scroll_')) {
            const scrollId = key.replace('scroll_', '');
            const element = document.querySelector(`[data-scroll-id="${scrollId}"]`);
            if (element) {
              element.scrollTop = value;
            }
          }
        });

        // Restore focus
        const activeElementId = this.stateSnapshots.get('activeElement');
        if (activeElementId) {
          const element = document.getElementById(activeElementId);
          if (element && element.focus) {
            element.focus();
          }
        }
      });

      console.log('[MobileLifecycle] State snapshot restored');
    } catch (error) {
      console.error('[MobileLifecycle] Failed to restore snapshot:', error);
    }
  }

  // Subscribe to lifecycle events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  notifyListeners(event, data = {}) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[MobileLifecycle] Listener error for ${event}:`, error);
        }
      });
    }
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Check if app was recently backgrounded
  wasRecentlyBackgrounded(thresholdMs = 5000) {
    if (!this.state.lastBackgroundTime) return false;
    return (Date.now() - this.state.lastBackgroundTime) < thresholdMs;
  }
}

export const mobileLifecycle = new MobileLifecycleManager();

// Debug utility
if (import.meta.env?.DEV) {
  window.__mobileLifecycle = mobileLifecycle;
}