import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { telemetry } from "./TelemetryService";

/**
 * Enhanced useQuery with intelligent retry logic and network awareness
 * 
 * Retry Rules:
 * - Network errors → retry up to 3 times with exponential backoff
 * - Auth errors (401, 403) → NO retry
 * - Validation errors (400, 422) → NO retry
 * - Server errors (500+) → retry once
 * 
 * Usage:
 * const { data, isError, error, retry } = useResilientQuery({
 *   queryKey: ['myData'],
 *   queryFn: () => fetchData(),
 *   context: 'Loading your tasks' // Human-readable context for error messages
 * });
 */
export function useResilientQuery(options) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const retryCountRef = useRef(0);
  const lastErrorRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const shouldRetry = (failureCount, error) => {
    // NO retry for auth errors
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }
    
    // NO retry for validation errors
    if (error?.status === 400 || error?.status === 422) {
      return false;
    }
    
    // Retry once for server errors
    if (error?.status >= 500) {
      return failureCount < 1;
    }
    
    // Network errors - retry up to 3 times
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return failureCount < 3;
    }
    
    // Default: retry once
    return failureCount < 1;
  };

  const query = useQuery({
    ...options,
    retry: (failureCount, error) => {
      retryCountRef.current = failureCount;
      lastErrorRef.current = error;
      return shouldRetry(failureCount, error);
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Disable automatic refetch when window regains focus if offline
    refetchOnWindowFocus: isOnline ? options.refetchOnWindowFocus : false,
  });

  // Log when retry is exhausted (async, after render)
  useEffect(() => {
    if (query.isError && retryCountRef.current > 0) {
      // Retry was attempted but still failed - this is a REAL error
      telemetry.logRetryExhausted(
        lastErrorRef.current,
        options.queryKey,
        retryCountRef.current,
        options.context || ''
      );
    }
  }, [query.isError, options.queryKey, options.context]);

  return {
    ...query,
    isOnline,
    // Expose manual retry for user-triggered actions
    retry: () => query.refetch(),
  };
}

/**
 * Get human-readable error message based on error type
 */
export function getErrorMessage(error, context = '', language = 'en') {
  if (!error) return null;

  const messages = {
    en: {
      network: 'Connection problem. Please check your internet.',
      auth: 'Authentication required. Please log in again.',
      notFound: 'Data not found.',
      server: 'Server error. Please try again later.',
      validation: 'Invalid data. Please check your input.',
      generic: context ? `Failed to load ${context}` : 'Something went wrong. Please try again.',
    },
    es: {
      network: 'Problema de conexión. Verifica tu internet.',
      auth: 'Autenticación requerida. Por favor inicia sesión.',
      notFound: 'Datos no encontrados.',
      server: 'Error del servidor. Intenta más tarde.',
      validation: 'Datos inválidos. Revisa tu entrada.',
      generic: context ? `No se pudo cargar ${context}` : 'Algo salió mal. Intenta nuevamente.',
    }
  };

  const lang = messages[language] || messages.en;

  // Network errors
  if (!navigator.onLine || error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return lang.network;
  }

  // Auth errors
  if (error?.status === 401 || error?.status === 403) {
    return lang.auth;
  }

  // Not found
  if (error?.status === 404) {
    return lang.notFound;
  }

  // Server errors
  if (error?.status >= 500) {
    return lang.server;
  }

  // Validation errors
  if (error?.status === 400 || error?.status === 422) {
    return lang.validation;
  }

  // Generic with context
  return lang.generic;
}

/**
 * Log error for future telemetry integration
 * PLACEHOLDER - no external services yet
 */
export function logQueryError(error, queryKey, context) {
  // Future: Send to telemetry service
  console.error('[Query Error]', {
    queryKey,
    context,
    error: error?.message,
    status: error?.status,
    timestamp: new Date().toISOString(),
  });
}