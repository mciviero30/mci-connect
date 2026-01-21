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
    // Feature flag - can be toggled via localStorage or environment
    this.enabled = localStorage.getItem('telemetry_enabled') !== 'false';
    
    // In-memory deduplication cache (prevents logging same error multiple times)
    this.errorCache = new Map();
    this.cacheTimeout = 60000; // 1 minute dedup window
  }

  /**
   * Check if error was recently logged (deduplication)
   */
  _isDuplicate(errorKey) {
    const now = Date.now();
    const lastLogged = this.errorCache.get(errorKey);
    
    if (lastLogged && (now - lastLogged) < this.cacheTimeout) {
      return true; // Duplicate - skip logging
    }
    
    this.errorCache.set(errorKey, now);
    
    // Cleanup old entries (prevent memory leak)
    if (this.errorCache.size > 100) {
      const oldestKeys = Array.from(this.errorCache.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 50)
        .map(e => e[0]);
      oldestKeys.forEach(key => this.errorCache.delete(key));
    }
    
    return false;
  }

  /**
   * Generate error signature for deduplication
   */
  _getErrorSignature(type, identifier, errorMessage) {
    return `${type}:${identifier}:${errorMessage?.substring(0, 100)}`;
  }

  /**
   * Async logging (does NOT block render)
   */
  _logAsync(logData) {
    // Run in next tick to avoid blocking render
    setTimeout(() => {
      console.error('[Telemetry]', logData);
      // Future: Send to external service
      // this._sendToExternalService(logData);
    }, 0);
  }

  /**
   * Log query error (only called when retry is exhausted)
   */
  logQueryError(error, queryKey, context = '') {
    if (!this.enabled) return;
    
    const signature = this._getErrorSignature('query', JSON.stringify(queryKey), error?.message);
    if (this._isDuplicate(signature)) return; // Skip duplicate
    
    const logData = {
      type: 'query_error',
      queryKey: JSON.stringify(queryKey),
      context,
      error: error?.message || 'Unknown error',
      status: error?.status,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      pathname: window.location.pathname,
      isOnline: navigator.onLine,
    };

    this._logAsync(logData);
  }

  /**
   * Log when retry is exhausted (SIGNAL: real unrecoverable error)
   */
  logRetryExhausted(error, queryKey, attemptCount, context = '') {
    if (!this.enabled) return;
    
    const signature = this._getErrorSignature('retry_exhausted', JSON.stringify(queryKey), error?.message);
    if (this._isDuplicate(signature)) return;
    
    const logData = {
      type: 'retry_exhausted',
      queryKey: JSON.stringify(queryKey),
      context,
      error: error?.message || 'Unknown error',
      status: error?.status,
      attemptCount,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      pathname: window.location.pathname,
      isOnline: navigator.onLine,
    };

    this._logAsync(logData);
  }

  /**
   * Log mutation error (user action failed)
   */
  logMutationError(error, mutationKey, context = '') {
    if (!this.enabled) return;
    
    const signature = this._getErrorSignature('mutation', JSON.stringify(mutationKey), error?.message);
    if (this._isDuplicate(signature)) return;
    
    const logData = {
      type: 'mutation_error',
      mutationKey: JSON.stringify(mutationKey),
      context,
      error: error?.message || 'Unknown error',
      status: error?.status,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      pathname: window.location.pathname,
    };

    this._logAsync(logData);
  }

  /**
   * Log network state change (only offline -> online transitions for signal)
   */
  logNetworkChange(isOnline) {
    if (!this.enabled) return;
    
    // Only log when coming back online (signal for sync events)
    if (!isOnline) return;
    
    const signature = this._getErrorSignature('network', 'online', 'reconnected');
    if (this._isDuplicate(signature)) return;
    
    const logData = {
      type: 'network_reconnect',
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
    };

    this._logAsync(logData);
  }

  /**
   * Log Error Boundary capture (CRITICAL: actual runtime crash)
   */
  logErrorBoundary(error, errorInfo, section) {
    if (!this.enabled) return;
    
    const signature = this._getErrorSignature('boundary', section, error?.message);
    if (this._isDuplicate(signature)) return;
    
    const logData = {
      type: 'error_boundary',
      section,
      error: error?.message || error?.toString(),
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines only
      componentStack: errorInfo?.componentStack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
      url: window.location.href,
    };

    this._logAsync(logData);
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('telemetry_enabled', enabled.toString());
  }

  /**
   * Clear deduplication cache (for testing)
   */
  clearCache() {
    this.errorCache.clear();
  }
}

export const telemetry = new TelemetryService();