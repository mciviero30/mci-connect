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
    console.warn('LineItem missing both item_name and description');
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
  
  // CRITICAL: Preserve ALL existing fields first
  const normalized = { ...item };
  
  // Ensure core fields exist with safe defaults (but NEVER overwrite existing values)
  if (normalized.item_name === undefined) normalized.item_name = '';
  if (normalized.description === undefined) normalized.description = '';
  if (normalized.quantity === undefined) normalized.quantity = 0;
  if (normalized.unit === undefined) normalized.unit = '';
  if (normalized.unit_price === undefined) normalized.unit_price = 0;
  if (normalized.total === undefined) normalized.total = 0;
  
  // Ensure numeric fields are numbers (but preserve if already set)
  normalized.quantity = Number(normalized.quantity) || 0;
  normalized.unit_price = Number(normalized.unit_price) || 0;
  normalized.total = Number(normalized.total) || 0;
  
  // Round to 2 decimals
  normalized.unit_price = Math.round(normalized.unit_price * 100) / 100;
  normalized.total = Math.round(normalized.total * 100) / 100;
  
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