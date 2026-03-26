import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Clock, Eye } from 'lucide-react';

/**
 * Real-time Performance Monitoring with Web Vitals
 * Tracks: LCP, FID, CLS, TTFB
 */

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    ttfb: null // Time to First Byte
  });

  useEffect(() => {
    // Observe Performance API
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Navigation Timing for TTFB
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        setMetrics(prev => ({ ...prev, ttfb: navEntry.responseStart - navEntry.requestStart }));
      }

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  const getScore = (metric, value) => {
    if (value === null) return 'measuring';
    
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };

    const t = thresholds[metric];
    if (value <= t.good) return 'good';
    if (value <= t.poor) return 'needs-improvement';
    return 'poor';
  };

  const formatValue = (metric, value) => {
    if (value === null) return '-';
    if (metric === 'cls') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Zap className="w-5 h-5 text-yellow-500" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(metrics).map(([metric, value]) => {
            const score = getScore(metric, value);
            return (
              <div key={metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                    {metric.toUpperCase()}
                  </span>
                  <Badge className={
                    score === 'good' ? 'bg-green-100 text-green-800 border-green-300' :
                    score === 'needs-improvement' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    score === 'poor' ? 'bg-red-100 text-red-800 border-red-300' :
                    'bg-slate-100 text-slate-800 border-slate-300'
                  }>
                    {score === 'measuring' ? '...' : score}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatValue(metric, value)}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Eye className="w-3 h-3" />
            <span>Real-time monitoring with Web Vitals API</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Hook to track custom performance metrics
 */
export const usePerformanceTracking = (metricName) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      
      // Send to analytics if needed
      if (window.base44?.analytics) {
        base44.analytics.track({
          eventName: 'performance_metric',
          properties: {
            metric: metricName,
            duration: Math.round(duration)
          }
        });
      }
    };
  }, [metricName]);
};