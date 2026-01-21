/**
 * Centralized telemetry service for error tracking
 * 
 * PLACEHOLDER for future integration with external services
 * Currently logs to console - ready to connect to Sentry, LogRocket, etc.
 * 
 * Usage:
 * import { telemetry } from '@/components/resilience/TelemetryService';
 * telemetry.logQueryError(error, queryKey, context);
 * telemetry.logRetryExhausted(error, queryKey, attemptCount);
 */

class TelemetryService {
  constructor() {
    this.enabled = true; // Can be toggled via environment variable
  }

  /**
   * Log query error
   */
  logQueryError(error, queryKey, context = '') {
    if (!this.enabled) return;
    
    const logData = {
      type: 'query_error',
      queryKey: JSON.stringify(queryKey),
      context,
      error: error?.message || 'Unknown error',
      status: error?.status,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      isOnline: navigator.onLine,
    };

    console.error('[Telemetry - Query Error]', logData);
    
    // Future: Send to external service
    // await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(logData) });
  }

  /**
   * Log when retry is exhausted
   */
  logRetryExhausted(error, queryKey, attemptCount) {
    if (!this.enabled) return;
    
    const logData = {
      type: 'retry_exhausted',
      queryKey: JSON.stringify(queryKey),
      error: error?.message || 'Unknown error',
      status: error?.status,
      attemptCount,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      isOnline: navigator.onLine,
    };

    console.warn('[Telemetry - Retry Exhausted]', logData);
    
    // Future: Send to external service
  }

  /**
   * Log mutation error
   */
  logMutationError(error, mutationKey, context = '') {
    if (!this.enabled) return;
    
    const logData = {
      type: 'mutation_error',
      mutationKey: JSON.stringify(mutationKey),
      context,
      error: error?.message || 'Unknown error',
      status: error?.status,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.error('[Telemetry - Mutation Error]', logData);
    
    // Future: Send to external service
  }

  /**
   * Log network state change
   */
  logNetworkChange(isOnline) {
    if (!this.enabled) return;
    
    const logData = {
      type: 'network_change',
      isOnline,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.info('[Telemetry - Network Change]', logData);
    
    // Future: Send to external service
  }
}

export const telemetry = new TelemetryService();