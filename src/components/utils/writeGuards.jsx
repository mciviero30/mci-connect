/**
 * WRITE GUARDS — Enforce user_id for new records (legacy tolerated)
 * 
 * Phase: Dual-Key Write Enforcement
 * Purpose: Ensure all NEW records include user_id
 * Legacy: Tolerate email-only writes with warnings (default)
 * Strict: Block writes without user_id for critical entities
 */

/**
 * STRICT MODE configuration
 * Toggle enforcement level per entity type
 */
const STRICT_MODE_ENTITIES = new Set([
  'Expense',
  'TimeEntry', 
  'Quote',
  'Invoice'
]);

/**
 * Check if strict mode is enabled
 * Can be controlled via env variable or runtime flag
 */
export function isStrictModeEnabled() {
  // Runtime feature flag (can be toggled via CompanySettings)
  if (typeof window !== 'undefined' && window.__STRICT_MODE_OVERRIDE !== undefined) {
    return window.__STRICT_MODE_OVERRIDE;
  }
  
  // Default: STRICT MODE ENABLED for production readiness
  return true;
}

/**
 * Error thrown when strict mode blocks a write
 */
export class UserIdRequiredError extends Error {
  constructor(entityName) {
    super(`User identity required to create ${entityName}. Please re-login or contact admin.`);
    this.name = 'UserIdRequiredError';
    this.entityName = entityName;
    this.code = 'USER_ID_REQUIRED';
  }
}

/**
 * Validates that a record includes user_id for employee attribution
 * @param {Object} data - Record data being written
 * @param {Object} currentUser - Authenticated user object
 * @param {string} entityName - Entity name for logging
 * @param {string} userIdField - Name of user_id field (default: 'user_id')
 * @returns {Object} Enhanced data with user_id enforced
 * @throws {UserIdRequiredError} If strict mode enabled and user_id missing
 */
export function enforceUserIdOnWrite(data, currentUser, entityName, userIdField = 'user_id') {
  if (!data || !currentUser) {
    console.error(`[WRITE GUARD] Missing data or user for ${entityName}`);
    return data;
  }

  // CRITICAL: If user_id already exists, pass through (backward compatible)
  if (data[userIdField]) {
    return data;
  }

  // NEW RECORD: Enforce user_id
  if (currentUser.id) {
    console.log(`[WRITE GUARD] ✅ Adding ${userIdField} to new ${entityName} record`, {
      user_id: currentUser.id,
      email: currentUser.email
    });
    
    return {
      ...data,
      [userIdField]: currentUser.id
    };
  }

  // STRICT MODE: Block writes for critical entities
  const isStrict = isStrictModeEnabled() && STRICT_MODE_ENTITIES.has(entityName);
  
  if (isStrict) {
    console.error(`[WRITE GUARD] 🚫 STRICT MODE: Blocking ${entityName} without user_id`, {
      userEmail: currentUser.email,
      hasUserId: !!currentUser.id,
      entityName
    });
    
    throw new UserIdRequiredError(entityName);
  }

  // LEGACY FALLBACK: Warn if user_id missing (non-strict entities)
  console.warn(`[WRITE GUARD] ⚠️ Legacy write without user_id for ${entityName}`, {
    userEmail: currentUser.email,
    hasUserId: !!currentUser.id,
    data
  });

  return data;
}

/**
 * Multi-field user attribution guard (e.g., Recognition with giver + receiver)
 * @param {Object} data - Record data
 * @param {Object} currentUser - Current user
 * @param {string} entityName - Entity name
 * @param {Array} fields - Array of {userIdField, emailField, sourceUserId?}
 * @returns {Object} Enhanced data
 * @throws {UserIdRequiredError} If strict mode enabled and any user_id missing
 */
export function enforceMultiUserAttribution(data, currentUser, entityName, fields) {
  let enhanced = { ...data };
  const isStrict = isStrictModeEnabled() && STRICT_MODE_ENTITIES.has(entityName);
  let missingUserIds = [];

  fields.forEach(({ userIdField, emailField, sourceUserId }) => {
    // If user_id already set, skip
    if (enhanced[userIdField]) return;

    // Determine source user ID
    const targetUserId = sourceUserId || currentUser?.id;

    if (targetUserId) {
      console.log(`[WRITE GUARD] ✅ Adding ${userIdField} to ${entityName}`, {
        field: userIdField,
        user_id: targetUserId
      });
      enhanced[userIdField] = targetUserId;
    } else {
      missingUserIds.push({ field: userIdField, email: enhanced[emailField] });
      
      console.warn(`[WRITE GUARD] ⚠️ No user_id for ${userIdField} in ${entityName}`, {
        emailField,
        email: enhanced[emailField]
      });
    }
  });

  // STRICT MODE: Block if any user_id missing
  if (isStrict && missingUserIds.length > 0) {
    console.error(`[WRITE GUARD] 🚫 STRICT MODE: Blocking ${entityName} with missing user_ids`, {
      missing: missingUserIds,
      entityName
    });
    
    throw new UserIdRequiredError(entityName);
  }

  return enhanced;
}

/**
 * Check if a write is a legacy update (has ID) vs new creation
 * @param {Object} data - Record data
 * @returns {boolean} True if updating existing record
 */
export function isLegacyUpdate(data) {
  return !!(data?.id || data?._id);
}

/**
 * Log legacy write statistics (for monitoring migration progress)
 */
let legacyWriteCount = 0;
let totalWriteCount = 0;

export function trackWriteStats(hasUserId, entityName) {
  totalWriteCount++;
  if (!hasUserId) {
    legacyWriteCount++;
  }

  // Log stats every 50 writes in DEV
  if (import.meta.env.DEV && totalWriteCount % 50 === 0) {
    const percentage = ((totalWriteCount - legacyWriteCount) / totalWriteCount * 100).toFixed(1);
    console.log(`[WRITE GUARD STATS] ${percentage}% of writes include user_id`, {
      total: totalWriteCount,
      withUserId: totalWriteCount - legacyWriteCount,
      legacy: legacyWriteCount,
      lastEntity: entityName
    });
  }
}

/**
 * Toggle strict mode at runtime (for testing/rollback)
 * Usage: window.toggleStrictMode(false) to disable
 */
if (typeof window !== 'undefined') {
  window.toggleStrictMode = (enabled) => {
    window.__STRICT_MODE_OVERRIDE = enabled;
    console.log(`[WRITE GUARD] STRICT MODE ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };
  
  window.getStrictModeStatus = () => {
    const status = isStrictModeEnabled();
    console.log(`[WRITE GUARD] STRICT MODE: ${status ? 'ON' : 'OFF'}`, {
      entities: Array.from(STRICT_MODE_ENTITIES),
      canToggle: true
    });
    return status;
  };
}