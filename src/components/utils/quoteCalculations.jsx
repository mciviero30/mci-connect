/**
 * CENTRALIZED QUOTE CALCULATIONS
 * Single source of truth for all quote totals
 */

/**
 * Calculate all quote totals from items and tax rate
 * @param {Array} items - Array of quote items
 * @param {Number} tax_rate - Tax rate percentage (0-100)
 * @returns {Object} - { subtotal, tax_amount, total, estimated_hours, estimated_cost }
 */
export function calculateQuoteTotals(items = [], tax_rate = 0) {
  // Filter invalid items
  const validItems = items.filter(item => 
    item && 
    typeof item.quantity === 'number' && 
    item.quantity > 0 &&
    typeof item.unit_price === 'number' &&
    item.unit_price >= 0
  );

  // Calculate subtotal
  const subtotal = validItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + itemTotal;
  }, 0);

  // Calculate tax
  const tax_amount = subtotal * (tax_rate / 100);

  // Calculate total
  const total = subtotal + tax_amount;

  // Calculate estimated hours (for labor planning, exclude auto-calculated items)
  const estimated_hours = validItems
    .filter(item => !item.auto_calculated)
    .reduce((sum, item) => {
      const installation_time = item.installation_time || 0;
      const quantity = item.quantity || 0;
      return sum + (installation_time * quantity);
    }, 0);

  // Calculate estimated cost (if cost_per_unit exists)
  const estimated_cost = validItems.reduce((sum, item) => {
    const cost = item.cost_per_unit || 0;
    const quantity = item.quantity || 0;
    return sum + (cost * quantity);
  }, 0);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(tax_amount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    estimated_hours: parseFloat(estimated_hours.toFixed(2)),
    estimated_cost: parseFloat(estimated_cost.toFixed(2)),
  };
}

/**
 * Calculate all invoice totals from items and tax rate
 * @param {Array} items - Array of invoice items
 * @param {Number} tax_rate - Tax rate percentage (0-100)
 * @param {Number} amount_paid - Amount already paid (default 0)
 * @returns {Object} - { subtotal, tax_amount, total, balance }
 */
export function calculateInvoiceTotals(items = [], tax_rate = 0, amount_paid = 0) {
  // Filter invalid items
  const validItems = items.filter(item => 
    item && 
    typeof item.quantity === 'number' && 
    item.quantity > 0 &&
    typeof item.unit_price === 'number' &&
    item.unit_price >= 0
  );

  // Calculate subtotal
  const subtotal = validItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + itemTotal;
  }, 0);

  // Calculate tax
  const tax_amount = subtotal * (tax_rate / 100);

  // Calculate total
  const total = subtotal + tax_amount;

  // Calculate balance
  const paid = parseFloat(amount_paid) || 0;
  const balance = total - paid;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(tax_amount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    amount_paid: parseFloat(paid.toFixed(2)),
    balance: parseFloat(balance.toFixed(2)),
  };
}

/**
 * Normalize quote item totals (ensures item.total matches quantity × unit_price)
 * CRITICAL: Preserves ALL existing fields using spread operator first
 * PROTECTION: Never loses item_name if it exists
 * @param {Array} items - Quote items
 * @returns {Array} - Normalized items
 */
export function normalizeQuoteItems(items = []) {
  return items.map(item => {
    // CRITICAL: Spread first to preserve ALL fields
    const normalized = { ...item };
    
    // Only normalize numeric fields (never recreate the object)
    normalized.quantity = parseFloat(normalized.quantity) || 0;
    normalized.unit_price = parseFloat(normalized.unit_price) || 0;
    normalized.total = parseFloat(((normalized.quantity || 0) * (normalized.unit_price || 0)).toFixed(2));
    
    // PROTECTION: Never lose item_name if it exists
    if (item.item_name && !normalized.item_name) {
      normalized.item_name = item.item_name;
    }
    
    return normalized;
  });
}

/**
 * Normalize invoice item totals
 * CRITICAL: Preserves ALL existing fields using spread operator first
 * PROTECTION: Never loses item_name if it exists
 * @param {Array} items - Invoice items
 * @returns {Array} - Normalized items
 */
export function normalizeInvoiceItems(items = []) {
  return items.map(item => {
    // CRITICAL: Spread first to preserve ALL fields
    const normalized = { ...item };
    
    // Only normalize numeric fields (never recreate the object)
    normalized.quantity = parseFloat(normalized.quantity) || 0;
    normalized.unit_price = parseFloat(normalized.unit_price) || 0;
    normalized.total = parseFloat(((normalized.quantity || 0) * (normalized.unit_price || 0)).toFixed(2));
    
    // PROTECTION: Never lose item_name if it exists
    if (item.item_name && !normalized.item_name) {
      normalized.item_name = item.item_name;
    }
    
    return normalized;
  });
}