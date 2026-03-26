/**
 * DEFENSIVE FORMATTING - Runtime Guards Against Date/Null Issues
 * ✅ No behavior changes - only safeguards against crashes
 */

import { format } from 'date-fns';

/**
 * Safe date formatting with fallback
 * @param {Date|string} dateValue - Date to format
 * @param {string} format - date-fns format string
 * @param {string} fallback - Fallback if date invalid
 * @returns {string} Formatted date or fallback
 */
export const safeFormatDate = (dateValue, formatStr, fallback = 'N/A') => {
  if (!dateValue) return fallback;
  
  try {
    // Handle string dates
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Guard against Invalid Date
    if (isNaN(date.getTime())) {
      if (import.meta.env.DEV) {
      }
      return fallback;
    }

    // Safe formatting with date-fns (imported at top level)
    return format(date, formatStr);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Defensive] Date formatting error:', err, { dateValue, formatStr });
    }
    return fallback;
  }
};

/**
 * Safe financial formatting
 * @param {number} value - Number to format
 * @param {string} currency - Currency code (default USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  try {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(num);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Defensive] Currency formatting error:', err, { value });
    }
    return `$${(Number(value) || 0).toFixed(2)}`;
  }
};

export const safeFormatCurrency = formatCurrency;

/**
 * Safe decimal formatting with guard against NaN
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default 2)
 * @returns {string} Formatted number
 */
export const safeFormatDecimal = (value, decimals = 2) => {
  try {
    const num = Number(value);
    if (isNaN(num)) {
      if (import.meta.env.DEV) {
      }
      return '0'.padEnd(decimals + 2, '0');
    }
    return num.toFixed(decimals);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Defensive] Decimal formatting error:', err, { value });
    }
    return '0'.padEnd(decimals + 2, '0');
  }
};

/**
 * Safe array access with type check
 * @param {*} array - Value to check
 * @returns {Array} Safe array or empty array
 */
export const safeCastArray = (array) => {
  return Array.isArray(array) ? array : [];
};

/**
 * Safe object access with fallback
 * @param {*} obj - Object to check
 * @param {*} fallback - Fallback value
 * @returns {object} Safe object or fallback
 */
export const safeCastObject = (obj, fallback = {}) => {
  return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : fallback;
};