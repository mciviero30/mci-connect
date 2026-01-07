/**
 * Camera State Manager
 * Handles camera lifecycle across app interruptions
 */

class CameraStateManager {
  constructor() {
    this.activeStreams = new Map();
    this.pendingCaptures = new Map();
    this.init();
  }

  init() {
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('[CameraState] Visibility hidden - pausing streams');
        this.pauseAllStreams();
      } else if (document.visibilityState === 'visible') {
        console.log('[CameraState] Visibility visible - resuming streams');
        this.resumeAllStreams();
      }
    });

    // Handle page freeze/resume (iOS Safari)
    window.addEventListener('freeze', () => {
      console.log('[CameraState] Page frozen - pausing streams');
      this.pauseAllStreams();
    });

    window.addEventListener('resume', () => {
      console.log('[CameraState] Page resumed - resuming streams');
      this.resumeAllStreams();
    });

    // Handle focus/blur (additional safety)
    window.addEventListener('blur', () => {
      console.log('[CameraState] Window blurred - pausing streams');
      this.pauseAllStreams();
    });

    window.addEventListener('focus', () => {
      console.log('[CameraState] Window focused - resuming streams');
      this.resumeAllStreams();
    });
  }

  // Register active camera stream
  registerStream(id, stream, config = {}) {
    this.activeStreams.set(id, {
      stream,
      config,
      isPaused: false,
      timestamp: Date.now(),
    });
  }

  // Unregister stream
  unregisterStream(id) {
    const entry = this.activeStreams.get(id);
    if (entry) {
      this.stopStream(entry.stream);
      this.activeStreams.delete(id);
    }
  }

  // Stop a media stream
  stopStream(stream) {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }

  // Pause all streams (on app background)
  pauseAllStreams() {
    this.activeStreams.forEach((entry, id) => {
      if (!entry.isPaused) {
        this.stopStream(entry.stream);
        entry.isPaused = true;
        
        // Save state for recovery
        sessionStorage.setItem(`camera_state_${id}`, JSON.stringify({
          config: entry.config,
          timestamp: Date.now(),
        }));
      }
    });
  }

  // Resume all streams (on app foreground)
  async resumeAllStreams() {
    const resumePromises = Array.from(this.activeStreams.entries()).map(async ([id, entry]) => {
      if (entry.isPaused) {
        try {
          // Add delay to prevent iOS camera race condition
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Attempt to restart stream
          const newStream = await navigator.mediaDevices.getUserMedia(entry.config);
          entry.stream = newStream;
          entry.isPaused = false;
          
          // Trigger callback if registered
          const callback = this.resumeCallbacks.get(id);
          if (callback) {
            callback(newStream);
          }
          
          console.log(`[CameraState] Stream ${id} resumed successfully`);
        } catch (error) {
          console.error(`[CameraState] Failed to resume camera ${id}:`, error);
          
          // Mark for manual recovery
          sessionStorage.setItem(`camera_recovery_needed_${id}`, 'true');
        }
      }
    });

    await Promise.allSettled(resumePromises);
  }

  // Register resume callback
  resumeCallbacks = new Map();
  
  onStreamResume(id, callback) {
    this.resumeCallbacks.set(id, callback);
  }

  // Save pending capture (for crash recovery)
  savePendingCapture(id, data) {
    this.pendingCaptures.set(id, {
      data,
      timestamp: Date.now(),
    });

    // Also persist to localStorage
    try {
      localStorage.setItem(`pending_capture_${id}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to save pending capture:', e);
    }
  }

  // Get pending capture
  getPendingCapture(id) {
    // Try memory first
    if (this.pendingCaptures.has(id)) {
      return this.pendingCaptures.get(id).data;
    }

    // Try localStorage
    try {
      const saved = localStorage.getItem(`pending_capture_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed.data;
        } else {
          localStorage.removeItem(`pending_capture_${id}`);
        }
      }
    } catch (e) {
      console.error('Failed to get pending capture:', e);
    }

    return null;
  }

  // Clear pending capture
  clearPendingCapture(id) {
    this.pendingCaptures.delete(id);
    try {
      localStorage.removeItem(`pending_capture_${id}`);
    } catch (e) {
      console.error('Failed to clear pending capture:', e);
    }
  }

  // Cleanup old captures
  cleanupOldCaptures() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('pending_capture_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            // Remove if older than 1 hour
            if (Date.now() - data.timestamp > 3600000) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (e) {
      console.error('Failed to cleanup old captures:', e);
    }
  }
}

export const cameraStateManager = new CameraStateManager();

// Cleanup on app load
if (typeof window !== 'undefined') {
  cameraStateManager.cleanupOldCaptures();
}