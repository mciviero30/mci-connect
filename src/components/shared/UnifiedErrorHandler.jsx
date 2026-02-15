import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";

/**
 * Unified Error Handler with Retry Logic
 * Provides consistent error messaging and automatic retry for transient failures
 */

export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

export const classifyError = (error) => {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status;

  if (status === 401 || status === 403 || message.includes('unauthorized')) {
    return ERROR_TYPES.AUTH;
  }
  if (status === 400 || message.includes('validation') || message.includes('invalid')) {
    return ERROR_TYPES.VALIDATION;
  }
  if (message.includes('network') || message.includes('timeout') || !navigator.onLine) {
    return ERROR_TYPES.NETWORK;
  }
  if (status >= 500) {
    return ERROR_TYPES.SERVER;
  }
  return ERROR_TYPES.UNKNOWN;
};

export const getErrorMessage = (error, language = 'en') => {
  const type = classifyError(error);
  const defaultMessage = error?.message || (language === 'es' ? 'Error desconocido' : 'Unknown error');

  const messages = {
    en: {
      network: 'Network error. Please check your connection.',
      auth: 'Authentication failed. Please log in again.',
      validation: defaultMessage,
      server: 'Server error. Please try again later.',
      unknown: defaultMessage
    },
    es: {
      network: 'Error de red. Verifica tu conexión.',
      auth: 'Error de autenticación. Inicia sesión de nuevo.',
      validation: defaultMessage,
      server: 'Error del servidor. Intenta más tarde.',
      unknown: defaultMessage
    }
  };

  return messages[language][type] || defaultMessage;
};

export const shouldRetry = (error, attemptCount = 0, maxRetries = 3) => {
  if (attemptCount >= maxRetries) return false;
  
  const type = classifyError(error);
  // Retry network and server errors, but not auth or validation
  return type === ERROR_TYPES.NETWORK || type === ERROR_TYPES.SERVER;
};

/**
 * Hook for handling errors with retry logic
 */
export const useErrorHandler = () => {
  const toast = useToast();
  const { language } = useLanguage();

  const handleError = (error, context = '') => {
    const message = getErrorMessage(error, language);
    const title = context || (language === 'es' ? 'Error' : 'Error');

    toast({
      title,
      description: message,
      variant: 'destructive'
    });
  };

  return { handleError, getErrorMessage, shouldRetry, classifyError };
};

/**
 * Retry wrapper for async operations
 */
export const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error, attempt, maxRetries)) {
        throw error;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};