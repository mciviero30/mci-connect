/**
 * WRITE GUARDS — Enforce user_id for new records (legacy tolerated)
 * 
 * Phase: Dual-Key Write Enforcement
 * Purpose: Ensure all NEW records include user_id
 * Legacy: Tolerate email-only writes with warnings
 */

/**
 * Validates that a record includes user_id for employee attribution
 * @param {Object} data - Record data being written
 * @param {Object} currentUser - Authenticated user object
 * @param {string} entityName - Entity name for logging
 * @param {string} userIdField - Name of user_id field (default: 'user_id')
 * @returns {Object} Enhanced data with user_id enforced
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

  // LEGACY FALLBACK: Warn if user_id missing
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
 */
export function enforceMultiUserAttribution(data, currentUser, entityName, fields) {
  let enhanced = { ...data };

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
      console.warn(`[WRITE GUARD] ⚠️ No user_id for ${userIdField} in ${entityName}`, {
        emailField,
        email: enhanced[emailField]
      });
    }
  });

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