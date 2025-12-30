/**
 * DOCUMENT ITEM RULES - Single source of truth for line item validation
 * 
 * Centralizes validation logic for both Quote and Invoice items
 * to prevent duplication and ensure consistency across the system.
 */

/**
 * Determine if a line item is valid for saving
 * 
 * Valid item criteria:
 * - Must have quantity > 0
 * - Must have either item_name OR description with content
 * 
 * @param {Object} item - Line item to validate
 * @returns {boolean} - True if item is valid, false otherwise
 */
export function isValidLineItem(item) {
  if (!item) return false;
  
  const qty = Number(item.quantity) || 0;
  const name = (item.item_name || '').trim();
  const desc = (item.description || '').trim();
  
  return qty > 0 && (name.length > 0 || desc.length > 0);
}