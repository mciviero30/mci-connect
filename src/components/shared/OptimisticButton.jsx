import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';

/**
 * OPTIMISTIC BUTTON
 * Feedback inmediato (<100ms) + estados visuales claros
 * 
 * Estados:
 * - idle: Normal
 * - processing: Spinner breve
 * - success: Checkmark breve
 * - error: Vuelve a idle
 */
export default function OptimisticButton({ 
  children, 
  onClick, 
  onSuccess,
  onError,
  className = '',
  successDuration = 1500,
  ...props 
}) {
  const [state, setState] = useState('idle'); // idle | processing | success | error

  const handleClick = async (e) => {
    // Immediate visual feedback
    setState('processing');
    if (navigator.vibrate) navigator.vibrate(10);

    try {
      await onClick?.(e);
      
      // Success state
      setState('success');
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      onSuccess?.();
      
      // Reset after brief success display
      setTimeout(() => setState('idle'), successDuration);
      
    } catch (error) {
      // Error state (brief)
      setState('error');
      if (navigator.vibrate) navigator.vibrate([10, 50, 10, 50, 10]);
      onError?.(error);
      
      // Reset after 2s
      setTimeout(() => setState('idle'), 2000);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={state === 'processing'}
      className={`${className} ${
        state === 'success' 
          ? 'bg-green-600 hover:bg-green-700' 
          : state === 'error'
          ? 'bg-red-600 hover:bg-red-700'
          : ''
      }`}
      {...props}
    >
      {state === 'processing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {state === 'success' && <Check className="w-4 h-4 mr-2" />}
      {state === 'success' ? 'Saved!' : children}
    </Button>
  );
}