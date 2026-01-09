import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';

/**
 * INLINE VALIDATION
 * Validación en tiempo real, NO intrusiva
 * 
 * Muestra estado inmediatamente:
 * - Valid: checkmark verde
 * - Invalid: razón clara
 * - Info: ayuda contextual
 */
export const InlineValidation = ({ 
  value, 
  validate, 
  errorMessage,
  successMessage,
  infoMessage,
  showSuccess = false,
}) => {
  const [status, setStatus] = useState('idle'); // idle | valid | invalid | info

  useEffect(() => {
    if (!value && !infoMessage) {
      setStatus('idle');
      return;
    }

    if (validate) {
      const isValid = validate(value);
      setStatus(isValid ? 'valid' : 'invalid');
    } else if (infoMessage) {
      setStatus('info');
    }
  }, [value, validate, infoMessage]);

  if (status === 'idle') return null;

  const configs = {
    valid: {
      icon: Check,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      message: successMessage || 'Looks good',
    },
    invalid: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      message: errorMessage || 'Invalid',
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      message: infoMessage,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  // No mostrar success si no está habilitado
  if (status === 'valid' && !showSuccess) return null;

  return (
    <div className={`flex items-start gap-2 ${config.bg} ${config.border} border-l-4 p-2.5 rounded-r-lg mt-1.5 text-xs`}>
      <Icon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0 mt-0.5`} />
      <p className={`${config.color} font-medium`}>
        {config.message}
      </p>
    </div>
  );
};

/**
 * FIELD VALIDATOR - Para inputs individuales
 */
export const FieldValidator = ({ 
  value, 
  rules = [], 
  label,
  children 
}) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    for (const rule of rules) {
      if (!rule.validate(value)) {
        setError(rule.message);
        return;
      }
    }
    setError(null);
  }, [value, rules]);

  return (
    <div>
      {children}
      {error && (
        <InlineValidation 
          value={value}
          errorMessage={error}
        />
      )}
    </div>
  );
};

/**
 * COMMON VALIDATION RULES
 */
export const commonRules = {
  required: (fieldName) => ({
    validate: (value) => !!value?.toString().trim(),
    message: `${fieldName} is required to save`,
  }),
  
  email: {
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Enter a valid email address',
  },
  
  phone: {
    validate: (value) => /^\(\d{3}\)\d{3}-\d{4}$/.test(value),
    message: 'Use format: (555)123-4567',
  },
  
  minLength: (min, fieldName) => ({
    validate: (value) => value?.length >= min,
    message: `${fieldName} needs at least ${min} characters`,
  }),
  
  number: (fieldName) => ({
    validate: (value) => !isNaN(value) && value !== '',
    message: `${fieldName} must be a number`,
  }),
  
  positive: (fieldName) => ({
    validate: (value) => parseFloat(value) > 0,
    message: `${fieldName} must be greater than 0`,
  }),
};