/**
 * Mobile Lifecycle Manager
 * Handles app background/foreground transitions without state loss
 * 
 * Real jobsite conditions:
 * - Incoming calls
 * - Screen lock
 * - App switching
 * - Offline/online transitions
 * - Long background periods
 */

class MobileLifecycleManager {
  constructor() {
    this.state = {
      isBackground: false,
      isOnline: navigator.onLine,
      lastForegroundTime: Date.now(),
      lastBackgroundTime: null,
      lastOnlineTime: Date.now(),
      lastOfflineTime: null,
      interruptionCount: 0,
      offlineCount: 0,
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
    
    // Online/offline (network changes)
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
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
    // DESKTOP FIX: Only trigger if document is visible (prevents false triggers)
    if (!this.state.isBackground || document.visibilityState !== 'visible') return;
    console.log('[MobileLifecycle] Window focused');
    this.onForeground();
  }

  handleBlur() {
    // DESKTOP FIX: Only trigger if document is hidden (prevents false triggers on desktop)
    if (this.state.isBackground || document.visibilityState === 'visible') return;
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
    
    if (import.meta.env?.DEV) {
      console.log('[MobileLifecycle] 🔽 App backgrounded', {
        time: new Date().toISOString(),
        online: this.state.isOnline,
        interruptionCount: this.state.interruptionCount + 1,
      });
    }
    
    this.state.isBackground = true;
    this.state.lastBackgroundTime = Date.now();
    this.state.interruptionCount++;

    // Take state snapshot
    this.captureStateSnapshot();
    
    // Notify listeners
    this.notifyListeners('background', { 
      online: this.state.isOnline,
      timestamp: Date.now() 
    });
  }

  onForeground() {
    if (!this.state.isBackground) return;
    
    const duration = Date.now() - (this.state.lastBackgroundTime || 0);
    
    if (import.meta.env?.DEV) {
      console.log('[MobileLifecycle] 🔼 App foregrounded', {
        time: new Date().toISOString(),
        duration: `${Math.round(duration/1000)}s`,
        online: this.state.isOnline,
        wasLongBackground: duration > 30000,
      });
    }
    
    this.state.isBackground = false;
    this.state.lastForegroundTime = Date.now();

    // Restore state snapshot
    this.restoreStateSnapshot();
    
    // Notify listeners
    this.notifyListeners('foreground', { 
      duration,
      online: this.state.isOnline,
      timestamp: Date.now(),
      wasLongBackground: duration > 30000,
    });
  }

  handleOnline() {
    if (this.state.isOnline) return;
    
    const offlineDuration = this.state.lastOfflineTime 
      ? Date.now() - this.state.lastOfflineTime 
      : 0;
    
    if (import.meta.env?.DEV) {
      console.log('[MobileLifecycle] 📶 Network online', {
        time: new Date().toISOString(),
        offlineDuration: `${Math.round(offlineDuration/1000)}s`,
      });
    }
    
    this.state.isOnline = true;
    this.state.lastOnlineTime = Date.now();
    
    this.notifyListeners('online', { 
      offlineDuration,
      timestamp: Date.now() 
    });
  }

  handleOffline() {
    if (!this.state.isOnline) return;
    
    if (import.meta.env?.DEV) {
      console.log('[MobileLifecycle] 📵 Network offline', {
        time: new Date().toISOString(),
        wasBackground: this.state.isBackground,
      });
    }
    
    this.state.isOnline = false;
    this.state.lastOfflineTime = Date.now();
    this.state.offlineCount++;
    
    this.notifyListeners('offline', { 
      timestamp: Date.now(),
      wasBackground: this.state.isBackground,
    });
  }

  captureStateSnapshot() {
    try {
      // Capture active element by ID only (no querySelector)
      if (document.activeElement && document.activeElement.id) {
        this.stateSnapshots.set('activeElement', document.activeElement.id);
      }

      // Mark snapshot time for debugging
      sessionStorage.setItem('field_snapshot_time', Date.now().toString());
      
      if (import.meta.env?.DEV) {
        console.log('[MobileLifecycle] ✅ State snapshot captured', {
          hasActiveElement: !!this.stateSnapshots.get('activeElement'),
        });
      }
    } catch (error) {
      console.error('[MobileLifecycle] ❌ Failed to capture snapshot:', error);
    }
  }

  restoreStateSnapshot() {
    try {
      // Restore focus by ID only (no querySelector)
      requestAnimationFrame(() => {
        const activeElementId = this.stateSnapshots.get('activeElement');
        if (activeElementId) {
          const element = document.getElementById(activeElementId);
          if (element && element.focus) {
            element.focus();
          }
        }
      });

      if (import.meta.env?.DEV) {
        const snapshotAge = Date.now() - parseInt(sessionStorage.getItem('field_snapshot_time') || '0');
        console.log('[MobileLifecycle] ✅ State snapshot restored', {
          ageSeconds: Math.round(snapshotAge / 1000),
        });
      }
    } catch (error) {
      console.error('[MobileLifecycle] ❌ Failed to restore snapshot:', error);
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