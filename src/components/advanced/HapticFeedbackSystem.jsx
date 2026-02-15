/**
 * Haptic Feedback System for Mobile Devices
 * Provides tactile feedback for user actions
 */

export const HapticFeedback = {
  // Light tap (success, navigation)
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Medium impact (button press, selection)
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  // Heavy impact (error, warning)
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  },

  // Success pattern
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  // Error pattern
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },

  // Selection (e.g., scrolling through items)
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
};

/**
 * Hook for haptic feedback
 */
export const useHaptic = () => {
  const trigger = (type = 'light') => {
    if (HapticFeedback[type]) {
      HapticFeedback[type]();
    }
  };

  return { trigger };
};

/**
 * Haptic Button Component
 */
import React from 'react';
import { Button } from '@/components/ui/button';

export const HapticButton = ({ children, onClick, hapticType = 'medium', ...props }) => {
  const handleClick = (e) => {
    HapticFeedback[hapticType]?.();
    onClick?.(e);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};