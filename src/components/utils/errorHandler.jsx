/**
 * Sistema centralizado de manejo de errores
 */

export class AppError extends Error {
  constructor(message, code, severity = 'error', metadata = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity; // 'error', 'warning', 'info'
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorCodes = {
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Data Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  
  // Permission Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Application Errors
  UNKNOWN: 'UNKNOWN',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR'
};

class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.listeners = [];
  }

  log(error) {
    const errorEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      code: error.code || ErrorCodes.UNKNOWN,
      severity: error.severity || 'error',
      stack: error.stack,
      metadata: error.metadata || {},
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Save to localStorage
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors.slice(0, 10)));
    } catch (e) {
      console.warn('Failed to save error logs to localStorage');
    }

    // Console log based on severity
    if (errorEntry.severity === 'error') {
      console.error('[ERROR]', errorEntry);
    } else if (errorEntry.severity === 'warning') {
      console.warn('[WARNING]', errorEntry);
    } else {
      console.info('[INFO]', errorEntry);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(errorEntry));

    return errorEntry;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getErrors(limit = 10) {
    return this.errors.slice(0, limit);
  }

  clear() {
    this.errors = [];
    localStorage.removeItem('error_logs');
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Maneja errores de manera consistente
 */
export function handleError(error, context = {}) {
  let appError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error.response) {
    // Error de API
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    if (status === 401) {
      appError = new AppError(
        'No autorizado. Por favor inicia sesión.',
        ErrorCodes.UNAUTHORIZED,
        'error',
        { status, context }
      );
    } else if (status === 403) {
      appError = new AppError(
        'No tienes permisos para realizar esta acción.',
        ErrorCodes.FORBIDDEN,
        'error',
        { status, context }
      );
    } else if (status === 404) {
      appError = new AppError(
        'Recurso no encontrado.',
        ErrorCodes.NOT_FOUND,
        'warning',
        { status, context }
      );
    } else if (status === 409) {
      appError = new AppError(
        'El recurso ya existe.',
        ErrorCodes.DUPLICATE,
        'warning',
        { status, context }
      );
    } else if (status >= 500) {
      appError = new AppError(
        'Error del servidor. Por favor intenta más tarde.',
        ErrorCodes.API_ERROR,
        'error',
        { status, context }
      );
    } else {
      appError = new AppError(
        message,
        ErrorCodes.API_ERROR,
        'error',
        { status, context }
      );
    }
  } else if (error.message?.includes('Network')) {
    appError = new AppError(
      'Error de conexión. Verifica tu internet.',
      ErrorCodes.NETWORK_ERROR,
      'error',
      context
    );
  } else {
    appError = new AppError(
      error.message || 'Error desconocido',
      ErrorCodes.UNKNOWN,
      'error',
      context
    );
  }

  errorLogger.log(appError);
  return appError;
}

/**
 * Wrapper para async operations con manejo de errores
 */
export async function tryCatch(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    const appError = handleError(error, context);
    throw appError;
  }
}