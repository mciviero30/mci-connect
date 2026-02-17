/**
 * ============================================================================
 * HYBRID OVERRIDE HELPERS (CAPA 2 - MANUAL OVERRIDE MANAGEMENT)
 * ============================================================================
 * 
 * Management of manual overrides for derived items.
 * Ensures SSOT (Single Source of Truth) is respected unless explicitly overridden.
 */

/**
 * Check if item has manual override enabled
 * @param {Object} item - Line item
 * @returns {boolean}
 */
export function hasManualOverride(item) {
  return item.manual_override === true && item.auto_calculated === true;
}

/**
 * Get effective quantity (respects manual override)
 * @param {Object} item - Line item
 * @param {number} calculatedQuantity - Fresh calculation from computeQuoteDerived
 * @returns {number}
 */
export function getEffectiveQuantity(item, calculatedQuantity) {
  // If manual override is active, use current quantity (user-edited)
  if (hasManualOverride(item)) {
    return item.quantity;
  }
  
  // Otherwise, use calculated quantity (SSOT)
  return calculatedQuantity;
}

/**
 * Toggle manual override for an item
 * @param {Object} item - Line item to modify
 * @param {boolean} enable - Enable or disable override
 * @returns {Object} Modified item
 */
export function toggleManualOverride(item, enable = true) {
  return {
    ...item,
    manual_override: enable,
    // If enabling override, lock current quantity as snapshot
    derived_quantity_snapshot: enable ? item.quantity : item.derived_quantity_snapshot
  };
}

/**
 * Reset item to auto-calculated (undo override)
 * @param {Object} item - Line item
 * @param {number} calculatedQuantity - Fresh calculation
 * @returns {Object} Modified item
 */
export function resetToAutoCalculated(item, calculatedQuantity) {
  return {
    ...item,
    quantity: calculatedQuantity,
    derived_quantity_snapshot: calculatedQuantity,
    manual_override: false
  };
}

/**
 * Check if item quantity differs from last snapshot (drift detection)
 * @param {Object} item - Line item
 * @returns {boolean} True if quantity drifted from snapshot
 */
export function hasQuantityDrift(item) {
  if (!item.auto_calculated) return false;
  if (item.manual_override) return false; // Override is intentional
  
  const currentQty = parseFloat(item.quantity) || 0;
  const snapshotQty = parseFloat(item.derived_quantity_snapshot) || 0;
  
  return Math.abs(currentQty - snapshotQty) > 0.01; // Float tolerance
}

/**
 * Validate item for data integrity
 * @param {Object} item - Line item
 * @returns {Object} { valid: boolean, warnings: string[] }
 */
export function validateDerivedItem(item) {
  const warnings = [];
  
  // Check for inconsistent state
  if (item.auto_calculated && !('derived_quantity_snapshot' in item)) {
    warnings.push('Missing derived_quantity_snapshot for auto-calculated item');
  }
  
  if (item.auto_calculated && !('manual_override' in item)) {
    warnings.push('Missing manual_override flag for auto-calculated item');
  }
  
  // Check for drift
  if (hasQuantityDrift(item)) {
    warnings.push('Quantity drifted from derived snapshot (data integrity warning)');
  }
  
  // Check override consistency
  if (item.manual_override && !item.auto_calculated) {
    warnings.push('Override flag set on non-derived item (should not happen)');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}