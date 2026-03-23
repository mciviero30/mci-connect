/**
 * Universal Phone Number Formatting Utility
 * Ensures consistent phone format across entire app: XXX-XXX-XXXX
 */

/**
 * Formats a phone number to XXX-XXX-XXXX format
 * @param {string} phone - Raw phone number (any format)
 * @returns {string} - Formatted phone number or empty string
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Must have exactly 10 digits
  if (digits.length !== 10) return phone; // Return original if invalid
  
  // Format as XXX-XXX-XXXX
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Validates if a phone number has correct format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid 10-digit US phone
 */
export function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

/**
 * Auto-formats phone as user types (for input fields)
 * @param {string} value - Current input value
 * @returns {string} - Formatted phone number
 */
export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}