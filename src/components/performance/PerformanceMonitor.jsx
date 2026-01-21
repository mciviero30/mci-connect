/**
 * FASE 10 - PERFORMANCE MONITOR
 * Observability pasiva y ligera para detectar degradación en sesiones largas
 * 
 * Principios:
 * - NO bloquear UI
 * - NO mostrar UI al usuario
 * - NO listeners globales permanentes
 * - Emisión solo cuando hay degradación real
 */

import { useEffect, useRef } from 'react';

// Thresholds
const THRESHOLDS = {
  FPS_MIN: 45,              // FPS mínimo aceptable
  FPS_SAMPLES: 60,          // Muestras para promediar (1 seg @ 60fps)
  MEMORY_GROWTH: 0.20,      // 20% crecimiento sin liberar
  MEMORY_CHECK_INTERVAL: 600000, // 10 min
  LONG_TASK_MS: 200,        // Tareas > 200ms
  RENDER_SPIKE_THRESHOLD: 50, // Renders por minuto
  EMIT_COOLDOWN: 300000,    // 5 min sin duplicados
};

// Deduplication state (per metric)
const lastEmitted = {
  fps: 0,
  memory: 0,
  render: 0,
  longtask: 0,
};

// Memory baseline (para detectar growth)
let memoryBaseline = null;

/**
 * Emit performance event via TelemetryService
 */
function emitPerformanceEvent(eventType, metadata) {
  const now = Date.now();
  
  // Check cooldown (anti-spam)
  if (lastEmitted[eventType] && now - lastEmitted[eventType] < THRESHOLDS.EMIT_COOLDOWN) {
    return; // Skip duplicate
  }

  lastEmitted[eventType] = now;

  // Emit via TelemetryService (if exists)
  console.log('[🎯 Performance Telemetry]', {
    event_type: `performance_${eventType}`,
    timestamp: new Date().toISOString(),
    source: 'client',
    metadata: {
      ...metadata,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connection: navigator.connection?.effectiveType || 'unknown',
    }
  });
}

/**
 * FPS Monitor - requestAnimationFrame sampling
 */
class FPSMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.samples = [];
    this.rafId = null;
    this.active = false;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  tick = () => {
    if (!this.active) return;

    const now = performance.now();
    this.frameCount++;

    // Calcular FPS cada segundo
    if (now - this.lastTime >= 1000) {
      const fps = this.frameCount;
      this.samples.push(fps);

      // Mantener solo últimas N muestras
      if (this.samples.length > THRESHOLDS.FPS_SAMPLES) {
        this.samples.shift();
      }

      // Detectar degradación sostenida
      if (this.samples.length >= 10) { // 10 segundos
        const avgFPS = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
        
        if (avgFPS < THRESHOLDS.FPS_MIN) {
          emitPerformanceEvent('fps_degraded', {
            avg_fps: Math.round(avgFPS),
            threshold: THRESHOLDS.FPS_MIN,
            samples_count: this.samples.length,
            duration_seconds: this.samples.length,
          });
        }
      }

      this.frameCount = 0;
      this.lastTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  stop() {
    this.active = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.samples = [];
  }
}

/**
 * Memory Monitor - JS Heap Size tracking
 */
class MemoryMonitor {
  constructor() {
    this.intervalId = null;
    this.active = false;
  }

  start() {
    if (this.active) return;
    if (!performance.memory) return; // Not available in all browsers

    this.active = true;
    memoryBaseline = performance.memory.usedJSHeapSize;

    this.intervalId = setInterval(() => {
      if (!this.active) return;

      const current = performance.memory.usedJSHeapSize;
      const growth = (current - memoryBaseline) / memoryBaseline;

      if (growth > THRESHOLDS.MEMORY_GROWTH) {
        emitPerformanceEvent('memory_growth', {
          current_mb: Math.round(current / 1024 / 1024),
          baseline_mb: Math.round(memoryBaseline / 1024 / 1024),
          growth_percent: Math.round(growth * 100),
          threshold_percent: THRESHOLDS.MEMORY_GROWTH * 100,
        });

        // Update baseline after emit (reset)
        memoryBaseline = current;
      }
    }, THRESHOLDS.MEMORY_CHECK_INTERVAL);
  }

  stop() {
    this.active = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Long Task Observer - PerformanceObserver
 */
class LongTaskObserver {
  constructor() {
    this.observer = null;
    this.active = false;
  }

  start() {
    if (this.active) return;
    if (!window.PerformanceObserver) return; // Not available

    this.active = true;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > THRESHOLDS.LONG_TASK_MS) {
            emitPerformanceEvent('long_task', {
              duration_ms: Math.round(entry.duration),
              threshold_ms: THRESHOLDS.LONG_TASK_MS,
              name: entry.name,
              start_time: Math.round(entry.startTime),
            });
          }
        }
      });

      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('[PerformanceMonitor] LongTask observer not supported:', error.message);
      this.active = false;
    }
  }

  stop() {
    this.active = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * Render Pressure Tracker
 */
class RenderPressureTracker {
  constructor(componentName) {
    this.componentName = componentName;
    this.renderCount = 0;
    this.lastReset = Date.now();
  }

  recordRender() {
    this.renderCount++;

    const elapsed = Date.now() - this.lastReset;

    // Check every minute
    if (elapsed >= 60000) {
      const rendersPerMinute = this.renderCount;

      if (rendersPerMinute > THRESHOLDS.RENDER_SPIKE_THRESHOLD) {
        emitPerformanceEvent('render_pressure', {
          component: this.componentName,
          renders_per_minute: rendersPerMinute,
          threshold: THRESHOLDS.RENDER_SPIKE_THRESHOLD,
        });
      }

      // Reset
      this.renderCount = 0;
      this.lastReset = Date.now();
    }
  }
}

/**
 * Central PerformanceMonitor
 */
export class PerformanceMonitor {
  constructor() {
    this.fpsMonitor = new FPSMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.longTaskObserver = new LongTaskObserver();
    this.active = false;
  }

  start() {
    if (this.active) return;
    this.active = true;

    this.fpsMonitor.start();
    this.memoryMonitor.start();
    this.longTaskObserver.start();
  }

  stop() {
    this.active = false;

    this.fpsMonitor.stop();
    this.memoryMonitor.stop();
    this.longTaskObserver.stop();
  }
}

/**
 * Hook: usePerformanceMonitor
 * Activa monitoreo en componentes críticos
 */
export function usePerformanceMonitor(componentName, options = {}) {
  const { enabled = true, trackRenders = false } = options;
  const monitorRef = useRef(null);
  const renderTrackerRef = useRef(null);

  useEffect(() => {
    // Skip if disabled or not visible
    if (!enabled || document.visibilityState !== 'visible') {
      return;
    }

    // Initialize monitor
    if (!monitorRef.current) {
      monitorRef.current = new PerformanceMonitor();
    }

    monitorRef.current.start();

    // Initialize render tracker
    if (trackRenders && !renderTrackerRef.current) {
      renderTrackerRef.current = new RenderPressureTracker(componentName);
    }

    // Cleanup on unmount or visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        monitorRef.current?.stop();
      } else {
        monitorRef.current?.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      monitorRef.current?.stop();
    };
  }, [enabled, componentName, trackRenders]);

  // Track renders if enabled
  useEffect(() => {
    if (trackRenders && renderTrackerRef.current) {
      renderTrackerRef.current.recordRender();
    }
  });

  return {
    isActive: monitorRef.current?.active || false,
  };
}

/**
 * Auto-protection: Reduce animations if severe degradation
 */
export function enablePerformanceMode() {
  // Set internal flag for components to respect
  sessionStorage.setItem('perf_mode_active', 'true');
  
  // Add CSS class to reduce motion
  document.documentElement.classList.add('performance-mode');
}

export function disablePerformanceMode() {
  sessionStorage.removeItem('perf_mode_active');
  document.documentElement.classList.remove('performance-mode');
}

export function isPerformanceModeActive() {
  return sessionStorage.getItem('perf_mode_active') === 'true';
}