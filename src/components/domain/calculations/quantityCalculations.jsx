/**
 * QUANTITY CALCULATION ENGINE
 * Pure functions for calculating line item quantities
 * NO React dependencies - deterministic and side-effect free
 */

/**
 * Calculate quantity for special calculation types
 * @param {Object} item - Line item object
 * @returns {number} - Calculated quantity
 */
export function calculateLineItemQuantity(item) {
  const techCount = parseInt(item.tech_count) || 1;
  const durationValue = parseFloat(item.duration_value) || 1;

  if (item.calculation_type === 'hotel') {
    // Hotel: Math.ceil(techCount / 2) × nights
    const rooms = Math.ceil(techCount / 2);
    return rooms * durationValue;
  } else if (item.calculation_type === 'per_diem') {
    // Per-diem: techCount × days
    return techCount * durationValue;
  } else if (item.calculation_type === 'hours') {
    // Hours (driving, normal, overtime): techCount × hours
    return techCount * durationValue;
  }
  
  // Default: return existing quantity
  return item.quantity || 1;
}