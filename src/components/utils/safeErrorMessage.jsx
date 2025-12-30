/**
 * SAFE ERROR MESSAGE UTILITY
 * Prevents code snippets and stack traces from showing in the UI
 */

/**
 * Sanitize error messages for user display
 * Logs full error in DEV console, returns safe message for UI
 * 
 * @param {Error|string|any} error - Error object or message
 * @param {string} fallback - Custom fallback message (optional)
 * @returns {string} - Safe, user-friendly error message
 */
export function safeErrorMessage(error, fallback = null) {
  // Default safe message
  const defaultMessage = fallback || 'Something went wrong. Please try again.';
  
  if (!error) return defaultMessage;
  
  // Extract message from error object
  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || error.toString();
  
  // Log full error in DEV console
  if (import.meta.env?.DEV) {
    console.error('🚨 Error caught by safeErrorMessage:', {
      message: errorMessage,
      stack: error?.stack,
      full: error
    });
  }
  
  // Check if message contains code patterns or is too long
  const codePatterns = /\bconst\b|\bfunction\b|\bimport\b|\bexport\b|\/\/|=>|\{|\}|\bthrow\b|\bat\s+\w+\.|\.jsx?:\d+/i;
  const isTooLong = errorMessage.length > 200;
  const hasCodePattern = codePatterns.test(errorMessage);
  
  if (isTooLong || hasCodePattern) {
    return defaultMessage;
  }
  
  // Return sanitized message
  return errorMessage;
}

/**
 * Sanitize error for toast notifications
 * 
 * @param {Error|string|any} error - Error object or message
 * @returns {string} - Safe message for toast
 */
export function safeToastMessage(error) {
  return safeErrorMessage(error, 'An error occurred');
}