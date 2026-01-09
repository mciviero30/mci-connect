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
          console.warn(`[Performance] ⚠️ Long render: ${renderTime.toFixed(1)}ms in ${componentName}`);
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

  /*
  // OLD FLOATING PANEL CODE - REMOVED
  const fpsStatus = metrics.fps >= 55 ? 'excellent' : metrics.fps >= 45 ? 'good' : metrics.fps >= 30 ? 'fair' : 'poor';
  const renderStatus = metrics.avgRenderTime < 10 ? 'excellent' : metrics.avgRenderTime < 16 ? 'good' : metrics.avgRenderTime < 50 ? 'fair' : 'poor';

  return (
    <div className="fixed top-20 left-4 z-[60] max-w-xs bg-slate-900/95 backdrop-blur-sm border-2 border-purple-500/50 rounded-xl shadow-2xl p-4 text-xs">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="font-bold text-white">Performance</span>
        <Badge className="ml-auto bg-purple-500/20 text-purple-300 text-[10px]">
          {componentName}
        </Badge>
      </div>

      {/* FPS */}
      <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">FPS</span>
          <div className="flex items-center gap-1">
            {fpsStatus === 'excellent' && <TrendingUp className="w-3 h-3 text-green-400" />}
            {fpsStatus === 'poor' && <TrendingDown className="w-3 h-3 text-red-400" />}
            <span className={`font-bold ${
              fpsStatus === 'excellent' ? 'text-green-400' :
              fpsStatus === 'good' ? 'text-blue-400' :
              fpsStatus === 'fair' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {metrics.fps}
            </span>
          </div>
        </div>
      </div>

      {/* Render Time */}
      <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-[10px]">Avg Render</span>
          <span className={`font-bold text-sm ${
            renderStatus === 'excellent' ? 'text-green-400' :
            renderStatus === 'good' ? 'text-blue-400' :
            renderStatus === 'fair' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {metrics.avgRenderTime}ms
          </span>
        </div>
        <div className="text-[9px] text-slate-500 flex justify-between">
          <span>Max: {metrics.maxRenderTime}ms</span>
          <span>Renders: {metrics.renderCount}</span>
        </div>
      </div>

      {/* Long Tasks Warning */}
      {metrics.longTasks > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span className="text-orange-300 text-[10px]">
              {metrics.longTasks} slow renders
            </span>
          </div>
        </div>
      )}

      {/* Memory */}
      {metrics.memoryMB > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">Memory</span>
            <span className={`font-bold text-sm ${
              metrics.memoryMB < 100 ? 'text-green-400' :
              metrics.memoryMB < 200 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {metrics.memoryMB}MB
            </span>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      {(fpsStatus === 'poor' || renderStatus === 'poor') && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="text-[9px] text-red-400 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Performance degraded - check console</span>
          </div>
        </div>
      )}
    </div>
  );
}