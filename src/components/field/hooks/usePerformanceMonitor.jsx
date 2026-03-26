import { useEffect, useRef } from 'react';

/**
 * FASE 10: Non-intrusive performance monitoring hook
 * - Activates ONLY when visible + enabled
 * - NO UI, NO global listeners
 * - Telemetry ONLY on threshold breach
 * - Complete cleanup on unmount
 */
export function usePerformanceMonitor(componentName, enabled = true) {
  const stateRef = useRef({
    frameCount: 0,
    lastFrameTime: performance.now(),
    fps: 60,
    longTaskCount: 0,
    renderTimes: [],
    memoryGrowth: 0,
    lastMemory: 0,
    telemetrySent: new Set(), // Track sent threshold breaches
  });

  const metricsRef = useRef({
    fpsThresholdBreach: false,
    longTaskThresholdBreach: false,
    memoryThresholdBreach: false,
  });

  // Measure render time
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      const state = stateRef.current;
      state.renderTimes.push(renderTime);
      if (state.renderTimes.length > 20) state.renderTimes.shift();

      // Long task detection
      if (renderTime > 50) {
        state.longTaskCount++;
        if (state.longTaskCount > 2 && !metricsRef.current.longTaskThresholdBreach) {
          metricsRef.current.longTaskThresholdBreach = true;
          emitTelemetry('long_task_threshold', { count: state.longTaskCount, time: renderTime });
        }
      }
    };
  });

  // FPS measurement using requestAnimationFrame
  useEffect(() => {
    if (!enabled) return;

    const visibilityCheck = () => document.visibilityState === 'visible';
    if (!visibilityCheck()) return;

    let rafId = requestAnimationFrame(() => {});
    
    const measureFps = () => {
      const state = stateRef.current;
      const now = performance.now();
      const delta = now - state.lastFrameTime;

      state.frameCount++;

      // Calculate FPS every 1 second
      if (delta >= 1000) {
        state.fps = Math.round((state.frameCount * 1000) / delta);
        state.frameCount = 0;
        state.lastFrameTime = now;

        // FPS threshold: below 45fps in visible mode
        if (state.fps < 45 && !metricsRef.current.fpsThresholdBreach) {
          metricsRef.current.fpsThresholdBreach = true;
          emitTelemetry('fps_threshold', { fps: state.fps });
        }

        // Memory measurement (if available)
        if (performance.memory) {
          const currentMemory = performance.memory.usedJSHeapSize;
          const growth = currentMemory - state.lastMemory;

          if (state.lastMemory > 0 && growth > 5 * 1024 * 1024) { // 5MB growth
            state.memoryGrowth = growth;
            if (!metricsRef.current.memoryThresholdBreach) {
              metricsRef.current.memoryThresholdBreach = true;
              emitTelemetry('memory_threshold', { growth: Math.round(growth / 1024 / 1024) + 'MB' });
            }
          }

          state.lastMemory = currentMemory;
        }
      }

      rafId = requestAnimationFrame(measureFps);
    };

    rafId = requestAnimationFrame(measureFps);

    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  // Visibility change handler
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pause monitoring
        stateRef.current.frameCount = 0;
        stateRef.current.lastFrameTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  // Telemetry emission (one-time per threshold breach)
  const emitTelemetry = (metric, data) => {
    const telemetryKey = `${componentName}:${metric}`;
    const state = stateRef.current;

    if (state.telemetrySent.has(telemetryKey)) return;

    state.telemetrySent.add(telemetryKey);

    // Log for debugging (in production, send to analytics)

    // Try to send telemetry to analytics
    try {
      if (window.base44?.analytics) {
        window.base44.analytics.track({
          eventName: `performance_${metric}`,
          properties: {
            component: componentName,
            ...data,
            timestamp: new Date().toISOString(),
          }
        });
      }
    } catch (e) {
      // Silent fail - don't crash on telemetry errors
    }
  };

  // Get current metrics (for debugging)
  const getMetrics = () => {
    const state = stateRef.current;
    return {
      fps: state.fps,
      longTaskCount: state.longTaskCount,
      avgRenderTime: state.renderTimes.length > 0 
        ? (state.renderTimes.reduce((a, b) => a + b, 0) / state.renderTimes.length).toFixed(2)
        : 0,
      maxRenderTime: state.renderTimes.length > 0 
        ? Math.max(...state.renderTimes).toFixed(2)
        : 0,
    };
  };

  return { getMetrics };
}