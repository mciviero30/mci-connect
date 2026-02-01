import React, { useEffect, useRef } from 'react';

/**
 * GestureHandler Hook — Centralized mobile gesture detection
 * Returns callback refs for parent components to wire up
 * 
 * CONSTRAINTS:
 * - Touch devices only
 * - Passive listeners
 * - Must not block scroll/click
 * - Clean up on unmount
 */

const EDGE_SWIPE_THRESHOLD = 24; // px from screen edge
const EDGE_SWIPE_VELOCITY = 0.5; // minimum pixels/ms
const LONG_PRESS_DURATION = 500; // ms
const TWO_FINGER_DISTANCE = 100; // max pixels between fingers

/**
 * Hook to set up gesture handlers
 * Returns callbacks for parent components
 */
export function useGestureHandler({
  onRightEdgeSwipe = () => {}, // Close panel
  onLeftEdgeSwipe = () => {}, // Open search
  onLongPress = () => {}, // Context menu
  onTwoFingerTap = () => {}, // Help tooltip
  canGestureClose = true, // For disabling close when no panel open
} = {}) {
  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const gestureEnabledRef = useRef(true);
  const containerRef = useRef(null);

  // Guard: only touch devices
  const isTouchDevice = () => {
    return window.matchMedia('(pointer: coarse)').matches;
  };

  // Guard: not in text input
  const isEditableElement = (el) => {
    const tag = el.tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || el.contentEditable === 'true';
  };

  // GESTURE 1: Edge swipe (right edge = close, left edge = open search)
  const handleTouchStart = (e) => {
    if (!isTouchDevice() || !gestureEnabledRef.current || e.touches.length > 2) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const screenWidth = window.innerWidth;

    touchStartRef.current = {
      x: startX,
      y: startY,
      timestamp: Date.now(),
      isRightEdge: startX >= screenWidth - EDGE_SWIPE_THRESHOLD,
      isLeftEdge: startX <= EDGE_SWIPE_THRESHOLD,
    };

    // GESTURE 3: Start long press timer (for dimension items)
    if (e.touches.length === 1 && e.target.dataset.dimensionId) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          const elapsed = Date.now() - touchStartRef.current.timestamp;
          // Verify finger hasn't moved significantly
          const touch = e.touches[0];
          const moveX = Math.abs(touch.clientX - touchStartRef.current.x);
          const moveY = Math.abs(touch.clientY - touchStartRef.current.y);
          if (moveX < 10 && moveY < 10) {
            gestureEnabledRef.current = false; // Disable scroll gestures during long press
            onLongPress(e.target.dataset.dimensionId);
          }
        }
      }, LONG_PRESS_DURATION);
    }
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;

    // Cancel long press if finger moves
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const moveX = Math.abs(touch.clientX - touchStartRef.current.x);
      const moveY = Math.abs(touch.clientY - touchStartRef.current.y);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleTouchEnd = (e) => {
    clearTimeout(longPressTimerRef.current);
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const duration = Date.now() - touchStartRef.current.timestamp;

    // GESTURE 2: Two-finger tap (use e.touches from before end)
    if (e.touches.length === 2 && e.changedTouches.length === 1) {
      const touch1 = e.touches[0];
      const touch2 = e.changedTouches[0];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      if (duration < 300 && distance < TWO_FINGER_DISTANCE) {
        onTwoFingerTap();
      }
    }

    // GESTURE 1: Edge swipes (only if finger stayed in edge zone)
    if (touchStartRef.current.isRightEdge && endX >= window.innerWidth - EDGE_SWIPE_THRESHOLD) {
      const swipeDistance = touchStartRef.current.x - endX;
      const velocity = swipeDistance / duration;

      if (swipeDistance > 30 && velocity > EDGE_SWIPE_VELOCITY) {
        if (canGestureClose) {
          onRightEdgeSwipe();
        }
      }
    } else if (touchStartRef.current.isLeftEdge && endX <= EDGE_SWIPE_THRESHOLD) {
      const swipeDistance = endX - touchStartRef.current.x;
      const velocity = swipeDistance / duration;

      if (swipeDistance > 30 && velocity > EDGE_SWIPE_VELOCITY) {
        onLeftEdgeSwipe();
      }
    }

    // Re-enable scroll gestures
    gestureEnabledRef.current = true;
    touchStartRef.current = null;
  };

  // Setup listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use capture phase for edge detection
    container.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart, true);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd, true);
      clearTimeout(longPressTimerRef.current);
    };
  }, [onRightEdgeSwipe, onLeftEdgeSwipe, onLongPress, onTwoFingerTap, canGestureClose]);

  return containerRef;
}

/**
 * GestureHandler Component — Wrapper for gesture detection
 * Wraps child content and wires up gesture callbacks
 */
export default function GestureHandler({
  children,
  onRightEdgeSwipe,
  onLeftEdgeSwipe,
  onLongPress,
  onTwoFingerTap,
  canGestureClose = true,
  className = '',
}) {
  const containerRef = useGestureHandler({
    onRightEdgeSwipe,
    onLeftEdgeSwipe,
    onLongPress,
    onTwoFingerTap,
    canGestureClose,
  });

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Dimension-specific gesture handler
 * Marks dimensions for long-press detection
 */
export function GestureDimension({ dimensionId, children, onLongPress }) {
  return (
    <div
      data-dimension-id={dimensionId}
      onContextMenu={(e) => e.preventDefault()} // Prevent native context menu
      className="touch-none select-none"
    >
      {children}
    </div>
  );
}