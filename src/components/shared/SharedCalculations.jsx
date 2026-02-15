/**
 * Shared Calculation Utilities
 * SSOT for all financial calculations
 */

export const calculateLineItemTotal = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  return quantity * unitPrice;
};

export const calculateSubtotal = (items = []) => {
  return items.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
};

export const calculateTaxAmount = (subtotal, taxRate) => {
  const rate = Number(taxRate) || 0;
  return (subtotal * rate) / 100;
};

export const calculateTotal = (subtotal, taxAmount) => {
  return subtotal + taxAmount;
};

export const calculateDocumentTotals = (items = [], taxRate = 0) => {
  const subtotal = calculateSubtotal(items);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const total = calculateTotal(subtotal, taxAmount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

export const calculateBalance = (total, amountPaid) => {
  const t = Number(total) || 0;
  const paid = Number(amountPaid) || 0;
  return Math.max(0, t - paid);
};

export const calculateProfitMargin = (total, estimatedCost) => {
  const t = Number(total) || 0;
  const cost = Number(estimatedCost) || 0;
  
  if (t === 0) return 0;
  
  const margin = ((t - cost) / t) * 100;
  return Number(margin.toFixed(2));
};

/**
 * Validate document calculations
 */
export const validateDocumentTotals = (document) => {
  const expected = calculateDocumentTotals(document.items, document.tax_rate);
  
  const subtotalMatch = Math.abs(expected.subtotal - (Number(document.subtotal) || 0)) < 0.01;
  const taxMatch = Math.abs(expected.tax_amount - (Number(document.tax_amount) || 0)) < 0.01;
  const totalMatch = Math.abs(expected.total - (Number(document.total) || 0)) < 0.01;

  const isValid = subtotalMatch && taxMatch && totalMatch;

  return {
    isValid,
    expected,
    actual: {
      subtotal: Number(document.subtotal) || 0,
      tax_amount: Number(document.tax_amount) || 0,
      total: Number(document.total) || 0
    },
    discrepancies: {
      subtotal: !subtotalMatch,
      tax: !taxMatch,
      total: !totalMatch
    }
  };
};

/**
 * Format currency consistently
 */
export const formatCurrency = (value, minimumFractionDigits = 2) => {
  const num = Number(value) || 0;
  return `$${num.toLocaleString('en-US', { 
    minimumFractionDigits, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  const num = Number(value) || 0;
  return `${num.toFixed(decimals)}%`;
};