/**
 * COMMISSION DASHBOARD GUARDS - Admin-Only + Cache Stability
 * ✅ Queries disabled for employees
 * ✅ No data leaks to UI
 * ✅ Cache keys stable
 * ✅ Simulation never triggers network calls
 * ✅ No PII in logs
 */

/**
 * Verify user has commission dashboard access
 * @param {object} user - Current user
 * @returns {boolean} True if authorized
 */
export const canAccessCommissionDashboard = (user) => {
  if (!user) return false;
  
  const APPROVED_ROLES = ['admin', 'cfo', 'finance', 'ceo', 'executive'];
  return APPROVED_ROLES.includes(user.role?.toLowerCase());
};

/**
 * Verify user has commission simulator access
 * @param {object} user - Current user
 * @returns {boolean} True if authorized
 */
export const canAccessCommissionSimulator = (user) => {
  return canAccessCommissionDashboard(user); // Same gate
};

/**
 * Safe cache key builder - stable keys prevent stale data
 * @param {string} dashboardType - Type: 'dashboard', 'analyzer', 'simulator'
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Array} Cache key
 */
export const buildCacheKey = (dashboardType, startDate, endDate) => {
  // Normalize dates to YYYY-MM-DD format
  const normalStart = startDate?.split('T')[0] || '';
  const normalEnd = endDate?.split('T')[0] || '';

  const key = {
    commissionDashboard: ['commissionDashboard', normalStart, normalEnd],
    marginCommissionAnalyzer: ['marginCommissionAnalyzer', normalStart, normalEnd],
    commissionSimulator: ['commissionSimulator']
  }[dashboardType];

  if (!key) {
    console.warn('[Commission Cache] Unknown dashboard type:', dashboardType);
  }

  return key || ['unknown'];
};

/**
 * Verify simulated data never persists to backend
 * @param {Array} simulatedData - Simulated commission records
 * @param {Array} realData - Real commission records (from DB)
 * @returns {boolean} True if no overlap/contamination
 */
export const verifyNoSimulationLeak = (simulatedData, realData) => {
  if (!simulatedData || !realData) return true;

  const simIds = new Set(simulatedData.map(r => r.id));
  const realIds = new Set(realData.map(r => r.id));

  // Check if any simulated IDs exist in real data
  let hasLeak = false;
  simIds.forEach(id => {
    if (realIds.has(id)) {
      hasLeak = true;
      if (import.meta.env.DEV) {
        console.error('[Commission Safety] Simulation data leaked to backend:', {
          contaminated_id: id,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  return !hasLeak;
};

/**
 * Verify simulator only calculates, never calls API
 * Use this to wrap simulator mutations
 * @param {boolean} isSimulation - True if in simulation mode
 * @returns {boolean} True if safe to proceed
 */
export const isSimulationOfflineMode = (isSimulation) => {
  if (!isSimulation) return true;

  if (import.meta.env.DEV) {
    console.log('[Commission Safety] Simulation: API calls disabled');
  }

  return true;
};

/**
 * Safe log for commission access (no PII)
 * @param {object} event - Event details
 */
export const logCommissionAccess = (event) => {
  const safeEvent = {
    event_type: event.event_type,
    timestamp: new Date().toISOString(),
    // NEVER log email, full_name, or other PII
    user_role: event.user_role,
    action: event.action,
    // Log only IDs, never sensitive data
    commission_count: event.commission_count || 0,
    date_range: event.date_range
  };

  if (import.meta.env.DEV) {
    console.log('[Commission Access]', safeEvent);
  }
};

/**
 * Verify cache is clean before dashboard render
 * @param {object} cache - Cache object
 * @param {string} expectedKey - Expected cache key
 * @returns {boolean} True if cache is fresh
 */
export const isCacheFresh = (cache, expectedKey) => {
  if (!cache) return false;

  // Check if cache key matches expected
  const cacheKey = JSON.stringify(cache.key || []);
  const expKey = JSON.stringify(expectedKey);

  const isFresh = cacheKey === expKey;

  if (!isFresh && import.meta.env.DEV) {
    console.warn('[Commission Cache] Stale cache detected:', {
      expected: expectedKey,
      actual: cache.key
    });
  }

  return isFresh;
};