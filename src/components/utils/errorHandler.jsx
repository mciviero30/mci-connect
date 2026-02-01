/**
 * Centralized error handling utility
 * Ensures consistent error messages across the app
 */

export const getErrorMessage = (error, defaultMessage = 'An error occurred', language = 'en') => {
  if (!error) return defaultMessage;

  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle API errors
  if (error.response?.data?.message) return error.response.data.message;
  if (error.data?.message) return error.data.message;

  // Handle standard error objects
  if (error.message) return error.message;

  // Fallback
  return defaultMessage;
};

export const logError = (context, error, isDev = import.meta.env.DEV) => {
  if (isDev) {
    console.error(`[${context}]`, error);
  }
};