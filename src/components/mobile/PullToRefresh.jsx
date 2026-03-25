import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 72;
const MAX_PULL = 100;

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const pullY = useMotionValue(0);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const rotation = useTransform(pullY, [0, MAX_PULL], [0, 360]);
  const opacity = useTransform(pullY, [20, PULL_THRESHOLD], [0, 1]);
  const scale = useTransform(pullY, [20, PULL_THRESHOLD], [0.5, 1]);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    return !el || el.scrollTop <= 0;
  }, []);

  const onTouchStart = useCallback((e) => {
    if (disabled || isRefreshing || !isAtTop()) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(false);
  }, [disabled, isRefreshing, isAtTop]);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || isRefreshing || !isAtTop()) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { pullY.set(0); return; }
    setIsPulling(true);
    // Rubber-band resistance
    const clamped = Math.min(dy * 0.5, MAX_PULL);
    pullY.set(clamped);
  }, [isRefreshing, isAtTop, pullY]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    setIsPulling(false);

    if (pullY.get() >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      await animate(pullY, PULL_THRESHOLD, { duration: 0.1 });
      try {
        await onRefresh();
      } finally {
        await animate(pullY, 0, { duration: 0.3, ease: 'easeOut' });
        setIsRefreshing(false);
      }
    } else {
      await animate(pullY, 0, { duration: 0.25, ease: 'easeOut' });
    }
  }, [pullY, isRefreshing, onRefresh]);

  const indicatorY = useTransform(pullY, [0, MAX_PULL], [-40, 8]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      data-pull-to-refresh="true"
      data-pull-to-refresh-enabled="true"
      data-refreshing={isRefreshing ? 'true' : 'false'}
      data-is-pulling={isPulling ? 'true' : 'false'}
      data-refresh-threshold={PULL_THRESHOLD}
      data-native-gesture="pull-to-refresh"
      aria-live="polite"
      aria-label="Pull to refresh"
      role="region"
      id="pull-to-refresh-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        style={{ y: indicatorY, opacity, scale }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-none"
      >
        <motion.div style={{ rotate: isRefreshing ? undefined : rotation }}>
          <RefreshCw
            className={`w-4 h-4 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </motion.div>
      </motion.div>

      {/* Content shifts down while pulling */}
      <motion.div style={{ y: pullY }}>
        {children}
      </motion.div>
    </div>
  );
}