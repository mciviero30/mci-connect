/**
 * LINE ITEM CONTRACT - Unified structure for Quote and Invoice items
 * 
 * This contract defines the core structure that both Quote and Invoice items share.
 * It does NOT replace existing fields - it ensures consistency and preservation.
 * 
 * Core Fields (required):
 * - item_name: string (title/name of the item)
 * - description: string (detailed description)
 * - quantity: number
 * - unit: string (e.g., "unit", "door", "trip")
 * - unit_price: number
 * - total: number (calculated: quantity * unit_price)
 * 
 * Extended Fields (optional, preserved):
 * - Any additional fields are preserved through spread operator
 * - Examples: installation_time, calculation_type, etc.
 */

/**
 * Core LineItem structure
 */
export const LineItemContract = {
  item_name: '',
  description: '',
  quantity: 0,
  unit: '',
  unit_price: 0,
  total: 0
};

/**
 * Validate that a line item has the required fields
 */
export function validateLineItem(item) {
  if (!item) return false;
  
  // item_name is the primary identifier - must exist
  if (!item.item_name && !item.description) {
    return false;
  }
  
  return true;
}

/**
 * Normalize a line item to match the contract while preserving all existing fields
 * CRITICAL: Uses spread operator to preserve unknown fields
 */
export function normalizeLineItem(item) {
  if (!item) return { ...LineItemContract };
  
  // CRITICAL: Spread FIRST to preserve ALL fields (extended properties, etc.)
  const normalized = { ...item };
  
  // Only set defaults for null/undefined core fields (never overwrite existing)
  if (normalized.item_name == null) normalized.item_name = '';
  if (normalized.description == null) normalized.description = '';
  if (normalized.unit == null) normalized.unit = '';
  
  // Normalize numeric fields
  normalized.quantity = Number(normalized.quantity) || 0;
  normalized.unit_price = Number(normalized.unit_price) || 0;
  
  // Round price to 2 decimals
  normalized.unit_price = Math.round(normalized.unit_price * 100) / 100;
  
  // CRITICAL: Recalculate total from quantity * unit_price (source of truth)
  normalized.total = Math.round((normalized.quantity * normalized.unit_price) * 100) / 100;
  
  return normalized;
}

/**
 * Ensure item_name is never lost
 * If item_name exists, never overwrite with empty
 */
export function protectItemName(item, newItem) {
  if (!item || !newItem) return newItem;
  
  // If original has item_name and new one is empty, preserve original
  if (item.item_name && !newItem.item_name) {
    return {
      ...newItem,
      item_name: item.item_name
    };
  }
  
  return newItem;
}