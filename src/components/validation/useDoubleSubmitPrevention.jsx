import { useState, useCallback, useRef } from 'react';

/**
 * DOUBLE SUBMIT PREVENTION
 * Previene doble tap en acciones críticas
 * 
 * - Bloquea submit inmediatamente
 * - Muestra estado de progreso
 * - Auto-reset en éxito/error
 */
export const useDoubleSubmitPrevention = (cooldownMs = 1000) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTime = useRef(0);

  const preventDoubleSubmit = useCallback(async (submitFn) => {
    // Check cooldown
    const now = Date.now();
    if (now - lastSubmitTime.current < cooldownMs) {
      return { prevented: true, reason: 'Too fast — wait a moment' };
    }

    // Already submitting
    if (isSubmitting) {
      return { prevented: true, reason: 'Already processing' };
    }

    // Block new submits
    setIsSubmitting(true);
    lastSubmitTime.current = now;

    try {
      const result = await submitFn();
      return { prevented: false, success: true, result };
    } catch (error) {
      return { prevented: false, success: false, error };
    } finally {
      // Reset after cooldown
      setTimeout(() => setIsSubmitting(false), cooldownMs);
    }
  }, [isSubmitting, cooldownMs]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    preventDoubleSubmit,
    reset,
  };
};

/**
 * DEBOUNCED ACTION
 * Previene spam de acciones repetidas
 */
export const useDebouncedAction = (delay = 300) => {
  const timeoutRef = useRef(null);

  const debounce = useCallback((action) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      action();
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debounce, cancel };
};