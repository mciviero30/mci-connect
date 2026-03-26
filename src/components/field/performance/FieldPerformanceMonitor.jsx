import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

/**
 * Field Performance Monitor (Dev Only)
 * Real-time monitoring of render performance and responsiveness
 * 
 * Tracks:
 * - Component render counts
 * - Render time (ms)
 * - FPS (frames per second)
 * - Long task warnings (> 50ms)
 * - Memory usage
 */
export default function FieldPerformanceMonitor({ componentName = 'Field' }) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    fps: 60,
    longTasks: 0,
    memoryMB: 0,
  });
  
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef([]);
  const lastFrameRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const longTasksRef = useRef(0);

  // Track renders
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      renderCountRef.current++;
      renderTimesRef.current.push(renderTime);
      
      // Keep last 100 renders
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }

      // Warn about long renders (> 16ms blocks 60fps)
      if (renderTime > 16) {
        longTasksRef.current++;
        if (import.meta.env?.DEV && renderTime > 50) {
        }
      }
    };
  });

  // Calculate FPS
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const now = performance.now();
      
      if (now >= lastTime + 1000) {
        fpsRef.current = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Update metrics every second
  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const interval = setInterval(() => {
      const avgRenderTime = renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
        : 0;
      
      const maxRenderTime = renderTimesRef.current.length > 0
        ? Math.max(...renderTimesRef.current)
        : 0;

      // Get memory usage (Chrome only)
      let memoryMB = 0;
      if (performance.memory) {
        memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      }

      setMetrics({
        renderCount: renderCountRef.current,
        avgRenderTime: Math.round(avgRenderTime * 10) / 10,
        maxRenderTime: Math.round(maxRenderTime * 10) / 10,
        fps: fpsRef.current,
        longTasks: longTasksRef.current,
        memoryMB,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // CRITICAL: NO UI IN PRODUCTION - LOGGING ONLY
  if (!import.meta.env?.DEV) return null;

  // Component is logging-only in DEV mode.
  // All UI is in FieldDebugDrawer.
  return null;
}