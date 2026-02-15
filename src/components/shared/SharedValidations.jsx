/**
 * Shared Validation Utilities
 * SSOT for all validation logic
 */

export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
};

export const validatePhone = (phone) => {
  if (!phone) return { valid: true }; // Phone is optional
  
  // US phone format: (000)000-0000
  const phoneRegex = /^\(\d{3}\)\d{3}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Phone must be in format (000)000-0000' };
  }
  
  return { valid: true };
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validateNumber = (value, fieldName = 'Value', options = {}) => {
  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (options.min !== undefined && num < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min}` };
  }
  
  if (options.max !== undefined && num > options.max) {
    return { valid: false, error: `${fieldName} must not exceed ${options.max}` };
  }
  
  return { valid: true };
};

export const validateDate = (dateString, fieldName = 'Date') => {
  if (!dateString) return { valid: false, error: `${fieldName} is required` };
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  
  return { valid: true };
};

/**
 * Validate geofence location
 */
export const validateGeofence = (distance, radius = 100) => {
  const distanceMeters = Number(distance);
  
  if (isNaN(distanceMeters)) {
    return { valid: false, error: 'Invalid distance' };
  }
  
  if (distanceMeters > radius) {
    return { 
      valid: false, 
      error: `You are ${distanceMeters}m away from job site. Must be within ${radius}m.` 
    };
  }
  
  return { valid: true };
};

/**
 * Batch validation
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];
    
    if (rule.required) {
      const result = validateRequired(value, rule.label || field);
      if (!result.valid) {
        errors[field] = result.error;
        return;
      }
    }
    
    if (rule.type === 'email') {
      const result = validateEmail(value);
      if (!result.valid) {
        errors[field] = result.error;
      }
    }
    
    if (rule.type === 'phone') {
      const result = validatePhone(value);
      if (!result.valid) {
        errors[field] = result.error;
      }
    }
    
    if (rule.type === 'number') {
      const result = validateNumber(value, rule.label || field, rule.options);
      if (!result.valid) {
        errors[field] = result.error;
      }
    }
    
    if (rule.type === 'date') {
      const result = validateDate(value, rule.label || field);
      if (!result.valid) {
        errors[field] = result.error;
      }
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};