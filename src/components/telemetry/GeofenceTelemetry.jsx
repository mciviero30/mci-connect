/**
 * GEOFENCE TELEMETRY SERVICE
 * 
 * GEOFENCE HARDENING PASO 4
 * 
 * Captura eventos críticos de geofence de forma silenciosa,
 * sin spam, sin bloquear UI, audit-ready.
 * 
 * Principios:
 * - Async & non-blocking
 * - Deduplicación inteligente (60s window)
 * - Safe (never throws)
 * - Preparado para Sentry/LogRocket futuro
 */

class GeofenceTelemetryService {
  constructor() {
    this.eventCache = new Map();
    this.maxCacheSize = 100;
    this.dedupeWindowMs = 60000; // 60 seconds
  }

  /**
   * Log a geofence event (async, non-blocking, deduplicated)
   */
  log(event) {
    // Execute async to never block UI
    queueMicrotask(() => {
      try {
        this._logInternal(event);
      } catch (error) {
        // Silent fail - telemetry should never crash the app
        console.error('[Geofence Telemetry] Failed to log event:', error);
      }
    });
  }

  _logInternal(event) {
    const {
      event_type,
      user_email,
      job_id,
      distance_meters,
      accuracy,
      source,
      metadata = {}
    } = event;

    // Validate required fields
    if (!event_type || !user_email) {
      console.warn('[Geofence Telemetry] Missing required fields:', event);
      return;
    }

    // Deduplication key
    const dedupeKey = `${event_type}:${user_email}:${job_id || 'null'}`;
    const now = Date.now();
    const cached = this.eventCache.get(dedupeKey);

    // Check if duplicate within window
    if (cached && (now - cached.timestamp) < this.dedupeWindowMs) {
      // Silent skip - don't log duplicates
      return;
    }

    // Update cache
    this.eventCache.set(dedupeKey, { timestamp: now });

    // Cleanup cache if too large
    if (this.eventCache.size > this.maxCacheSize) {
      const oldestKey = this.eventCache.keys().next().value;
      this.eventCache.delete(oldestKey);
    }

    // Build telemetry payload
    const payload = {
      event_type,
      user_email,
      job_id: job_id || null,
      distance_meters: distance_meters !== undefined ? Math.round(distance_meters) : null,
      accuracy: accuracy !== undefined ? Math.round(accuracy) : null,
      source: source || 'frontend',
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Log to console (prepare for future external service)
    console.log('[🎯 Geofence Telemetry]', payload);

    // FUTURE: Send to external telemetry service
    // this._sendToSentry(payload);
    // this._sendToLogRocket(payload);
  }

  /**
   * Clear cache (for testing or session end)
   */
  clearCache() {
    this.eventCache.clear();
  }

  /**
   * FUTURE: Integration with Sentry
   */
  // _sendToSentry(payload) {
  //   if (window.Sentry) {
  //     Sentry.captureMessage(`Geofence Event: ${payload.event_type}`, {
  //       level: 'info',
  //       tags: {
  //         event_type: payload.event_type,
  //         source: payload.source
  //       },
  //       extra: payload
  //     });
  //   }
  // }
}

// Singleton instance
const telemetry = new GeofenceTelemetryService();

export default telemetry;

/**
 * Event Types Reference:
 * 
 * - clock_in_geofence_failed: Clock in attempt outside geofence
 * - clock_out_geofence_failed: Clock out attempt outside geofence
 * - break_outside_geofence: Break started/ended outside geofence
 * - geolocation_permission_denied: GPS permission denied by user
 * - geofence_backend_discrepancy: Frontend/backend validation mismatch
 * - auto_clock_out_triggered: Auto clock-out due to geofence exit
 */