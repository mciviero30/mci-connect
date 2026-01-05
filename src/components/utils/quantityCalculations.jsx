/**
 * QUANTITY CALCULATIONS - Single Source of Truth
 * 
 * Centralized quantity calculation for quote line items
 * with special calculation types (hotel, per_diem, hours).
 * 
 * PURE FUNCTIONS - Same inputs always produce same outputs
 */

/**
 * Calculate item quantity based on calculation_type
 * 
 * @param {Object} item - Line item object
 * @param {number} item.tech_count - Number of technicians
 * @param {number} item.duration_value - Duration (nights/days/hours)
 * @param {string} item.calculation_type - Type: 'hotel' | 'per_diem' | 'hours' | 'none'
 * @param {number} item.quantity - Fallback quantity if calculation_type is 'none'
 * @returns {number} - Calculated quantity
 */
export function calculateQuantity(item) {
  const techCount = parseInt(item.tech_count) || 1;
  const durationValue = parseFloat(item.duration_value) || 1;

  if (item.calculation_type === 'hotel') {
    // Hotel: Math.ceil(techCount / 2) × nights
    const rooms = Math.ceil(techCount / 2);
    return rooms * durationValue;
  } else if (item.calculation_type === 'per_diem') {
    // Per-diem: tech_count × days
    return techCount * durationValue;
  } else if (item.calculation_type === 'hours') {
    // Hours (driving, normal, overtime): tech_count × hours
    return techCount * durationValue;
  }
  
  // Default: use item's quantity
  return item.quantity || 1;
}