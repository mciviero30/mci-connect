/**
 * Sistema de validación de datos
 */

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const validators = {
  required: (value, fieldName = 'Este campo') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      throw new ValidationError(fieldName, `${fieldName} es requerido`);
    }
    return true;
  },

  email: (value, fieldName = 'Email') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      throw new ValidationError(fieldName, 'Email inválido');
    }
    return true;
  },

  phone: (value, fieldName = 'Teléfono') => {
    const phoneRegex = /^\d{10}$/;
    if (value && !phoneRegex.test(value.replace(/\D/g, ''))) {
      throw new ValidationError(fieldName, 'Teléfono debe tener 10 dígitos');
    }
    return true;
  },

  minLength: (min) => (value, fieldName = 'Este campo') => {
    if (value && value.length < min) {
      throw new ValidationError(fieldName, `${fieldName} debe tener al menos ${min} caracteres`);
    }
    return true;
  },

  maxLength: (max) => (value, fieldName = 'Este campo') => {
    if (value && value.length > max) {
      throw new ValidationError(fieldName, `${fieldName} no puede exceder ${max} caracteres`);
    }
    return true;
  },

  number: (value, fieldName = 'Este campo') => {
    if (value && isNaN(Number(value))) {
      throw new ValidationError(fieldName, `${fieldName} debe ser un número`);
    }
    return true;
  },

  positiveNumber: (value, fieldName = 'Este campo') => {
    if (value && Number(value) <= 0) {
      throw new ValidationError(fieldName, `${fieldName} debe ser un número positivo`);
    }
    return true;
  },

  date: (value, fieldName = 'Fecha') => {
    if (value && isNaN(Date.parse(value))) {
      throw new ValidationError(fieldName, 'Fecha inválida');
    }
    return true;
  },

  url: (value, fieldName = 'URL') => {
    try {
      if (value) new URL(value);
      return true;
    } catch {
      throw new ValidationError(fieldName, 'URL inválida');
    }
  }
};

/**
 * Valida un objeto contra un schema de validación
 */
export function validate(data, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    try {
      for (const rule of rules) {
        rule(value, field);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors[field] = error.message;
      } else {
        errors[field] = 'Error de validación';
      }
    }
  }
  
  if (Object.keys(errors).length > 0) {
    const error = new Error('Errores de validación');
    error.errors = errors;
    throw error;
  }
  
  return true;
}

/**
 * Valida datos de empleado
 */
export const employeeValidation = {
  full_name: [validators.required, validators.minLength(2)],
  email: [validators.required, validators.email],
  phone: [validators.phone],
  hourly_rate: [validators.number, validators.positiveNumber],
  hire_date: [validators.date],
  dob: [validators.date]
};

/**
 * Valida datos de trabajo
 */
export const jobValidation = {
  name: [validators.required, validators.minLength(3)],
  contract_amount: [validators.number, validators.positiveNumber]
};

/**
 * Valida datos de transacción
 */
export const transactionValidation = {
  amount: [validators.required, validators.number, validators.positiveNumber],
  description: [validators.required, validators.minLength(3)],
  date: [validators.required, validators.date]
};