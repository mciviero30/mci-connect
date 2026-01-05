/**
 * DERIVED ITEM QUANTITIES ENGINE
 * 
 * Hotel Rooms and Per Diem are DERIVED values, not persisted quantities.
 * They recalculate automatically based on installation_time of regular items.
 * 
 * Business Rules:
 * - Hotel & Per Diem quantities are ALWAYS derived from project duration
 * - Project duration is ALWAYS derived from items with installation_time
 * - Recalculation is AUTOMATIC when any item changes
 * - Manual override is OPTIONAL (user must explicitly enable)
 */

import { calculateStayDuration } from './stayDuration';

/**
 * Calculate derived quantity for auto-calculated items
 * @param {Object} item - The line item
 * @param {Array} allItems - All items in the quote/invoice
 * @param {number} techCount - Number of technicians
 * @param {number} travelTimeHours - Travel time in hours
 * @param {number} roomsPerNight - Rooms per night
 * @returns {number} - Derived quantity
 */
export function getDerivedQuantity(item, allItems, techCount = 2, travelTimeHours = 0, roomsPerNight = 1) {
  // If manual override is enabled, return stored quantity
  if (item.manual_override) {
    return item.quantity || 0;
  }

  // If not auto-calculated, return stored quantity
  if (!item.auto_calculated) {
    return item.quantity || 0;
  }

  // Calculate project duration from all items
  const result = calculateStayDuration({
    items: allItems,
    techCount,
    travelTimeHours,
    roomsPerNight
  });

  if (!result) {
    return 0;
  }

  // Return derived quantity based on calculation_type
  switch (item.calculation_type) {
    case 'hotel':
      return result.totalHotelRooms;
    case 'per_diem':
      return result.totalPerDiem;
    default:
      return item.quantity || 0;
  }
}

/**
 * Enrich items with derived quantities for display/calculation
 * This does NOT mutate the original items, returns new array
 * @param {Array} items - Original items
 * @param {number} techCount - Number of technicians
 * @param {number} travelTimeHours - Travel time
 * @param {number} roomsPerNight - Rooms per night
 * @returns {Array} - Items with derived quantities
 */
export function enrichItemsWithDerivedQuantities(items = [], techCount = 2, travelTimeHours = 0, roomsPerNight = 1) {
  if (!items || items.length === 0) return [];

  return items.map(item => {
    const derivedQuantity = getDerivedQuantity(item, items, techCount, travelTimeHours, roomsPerNight);
    const finalQuantity = item.auto_calculated && !item.manual_override ? derivedQuantity : item.quantity;
    
    return {
      ...item,
      quantity: finalQuantity,
      total: finalQuantity * (item.unit_price || 0),
      _isDerived: item.auto_calculated && !item.manual_override
    };
  });
}

/**
 * Check if an item is auto-calculated (hotel or per diem)
 */
export function isAutoCalculatedItem(item) {
  return item.auto_calculated === true || 
         (item.calculation_type === 'hotel' || item.calculation_type === 'per_diem');
}

/**
 * Create an auto-calculated item (hotel or per diem)
 */
export function createAutoCalculatedItem(type, unitPrice, description) {
  return {
    item_name: type === 'hotel' ? 'Hotel Rooms' : 'Per Diem',
    description: description || (type === 'hotel' ? 'Hotel accommodation' : 'Daily meal allowance'),
    calculation_type: type,
    auto_calculated: true,
    manual_override: false,
    quantity: 0, // This will be derived
    unit: type === 'hotel' ? 'rooms' : 'days',
    unit_price: unitPrice,
    total: 0,
    is_travel_item: true
  };
}