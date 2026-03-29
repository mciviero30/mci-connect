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
/**
 * GPS_ACCURACY NOTE:
 * The geofence radius and GPS accuracy are INDEPENDENT concepts.
 * - radius: how far from the job site is allowed (business rule, configured per job)
 * - accuracy: how precise the GPS reading is (device/signal quality)
 *
 * We apply an accuracy tolerance: if GPS accuracy > 30m, we add half the
 * accuracy error as a buffer to avoid false rejections indoors.
 * Formula: effectiveDistance = distance - (accuracy > 30 ? accuracy * 0.5 : 0)
 */
export const validateGeofence = (distance, radius = 100, accuracy = 0) => {
  const distanceMeters = Number(distance);
  
  if (isNaN(distanceMeters)) {
    return { valid: false, error: 'Invalid distance' };
  }
  
  // ACCURACY BUFFER: poor GPS gets benefit of the doubt (max 50m buffer)
  const accuracyBuffer = accuracy > 30 ? Math.min(accuracy * 0.5, 50) : 0;
  const effectiveDistance = Math.max(0, distanceMeters - accuracyBuffer);

  if (effectiveDistance > radius) {
    const bufferNote = accuracyBuffer > 0 ? ` (GPS ±${Math.round(accuracy)}m)` : '';
    return {
      valid: false,
      error: `You are ${Math.round(effectiveDistance)}m from job site. Must be within ${radius}m.${bufferNote}`
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