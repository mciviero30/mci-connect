/**
 * MCI Field - Measurement Type Validation and Logic
 * Strict validation for measurement types and numeric values
 */

// Wall-to-wall measurement types
export const WALL_TO_WALL_TYPES = {
  'FF-FF': {
    label: 'Finish Face to Finish Face',
    category: 'wall_to_wall',
    description: 'Measurement between two finish faces',
    requiresBenchmark: false,
  },
  'FF-CL': {
    label: 'Finish Face to Center Line',
    category: 'wall_to_wall',
    description: 'Measurement from finish face to center line',
    requiresBenchmark: false,
  },
  'CL-FF': {
    label: 'Center Line to Finish Face',
    category: 'wall_to_wall',
    description: 'Measurement from center line to finish face',
    requiresBenchmark: false,
  },
  'CL-CL': {
    label: 'Center Line to Center Line',
    category: 'wall_to_wall',
    description: 'Measurement between two center lines',
    requiresBenchmark: false,
  },
};

// Vertical/Benchmark measurement types
export const VERTICAL_TYPES = {
  'BM-C': {
    label: 'Benchmark to Ceiling',
    category: 'vertical',
    description: 'Vertical measurement from benchmark to ceiling',
    requiresBenchmark: true,
  },
  'BM-F': {
    label: 'Benchmark to Floor',
    category: 'vertical',
    description: 'Vertical measurement from benchmark to floor',
    requiresBenchmark: true,
  },
  'F-C': {
    label: 'Floor to Ceiling',
    category: 'vertical',
    description: 'Vertical measurement from floor to ceiling',
    requiresBenchmark: false,
  },
  'BM': {
    label: 'Benchmark Only',
    category: 'benchmark',
    description: 'Benchmark reference point (no measurement)',
    requiresBenchmark: false,
  },
};

// All measurement types combined
export const MEASUREMENT_TYPES = {
  ...WALL_TO_WALL_TYPES,
  ...VERTICAL_TYPES,
};

/**
 * Validate measurement type is from allowed list
 */
export function validateMeasurementType(type) {
  if (!type) {
    return { valid: false, error: 'Measurement type is required' };
  }

  if (!MEASUREMENT_TYPES[type]) {
    return { valid: false, error: `Invalid measurement type: ${type}` };
  }

  return { valid: true };
}

/**
 * Check if measurement type requires a benchmark
 */
export function requiresBenchmark(type) {
  const config = MEASUREMENT_TYPES[type];
  return config?.requiresBenchmark || false;
}

/**
 * Get measurement type category
 */
export function getMeasurementCategory(type) {
  const config = MEASUREMENT_TYPES[type];
  return config?.category || null;
}

/**
 * Validate numeric measurement value (imperial)
 */
export function validateImperialValue(feet, inches, fraction) {
  const errors = [];

  // Validate feet
  if (feet !== undefined && feet !== null) {
    if (!Number.isFinite(feet) || feet < 0) {
      errors.push('Feet must be a non-negative number');
    }
  }

  // Validate inches
  if (inches !== undefined && inches !== null) {
    if (!Number.isFinite(inches) || inches < 0 || inches >= 12) {
      errors.push('Inches must be between 0 and 11');
    }
  }

  // Validate fraction
  const validFractions = [
    '0', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16',
    '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16'
  ];
  
  if (fraction && !validFractions.includes(fraction)) {
    errors.push('Invalid fraction value');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate numeric measurement value (metric)
 */
export function validateMetricValue(mm) {
  if (mm === undefined || mm === null) {
    return { valid: false, errors: ['Millimeter value is required'] };
  }

  if (!Number.isFinite(mm) || mm <= 0) {
    return { valid: false, errors: ['Millimeters must be a positive number'] };
  }

  return { valid: true, errors: [] };
}

/**
 * Convert imperial to millimeters
 */
export function imperialToMM(feet, inches, fraction) {
  const feetToMM = feet * 304.8;
  const inchesToMM = inches * 25.4;
  
  // Convert fraction string to decimal
  let fractionDecimal = 0;
  if (fraction && fraction !== '0') {
    const [numerator, denominator] = fraction.split('/').map(Number);
    fractionDecimal = (numerator / denominator) * 25.4;
  }
  
  return feetToMM + inchesToMM + fractionDecimal;
}

/**
 * Convert millimeters to imperial
 */
export function mmToImperial(mm) {
  const totalInches = mm / 25.4;
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;
  const inches = Math.floor(remainingInches);
  const fractionalInches = remainingInches - inches;
  
  // Find closest fraction
  const fractions = [
    { value: 0, label: '0' },
    { value: 1/16, label: '1/16' },
    { value: 1/8, label: '1/8' },
    { value: 3/16, label: '3/16' },
    { value: 1/4, label: '1/4' },
    { value: 5/16, label: '5/16' },
    { value: 3/8, label: '3/8' },
    { value: 7/16, label: '7/16' },
    { value: 1/2, label: '1/2' },
    { value: 9/16, label: '9/16' },
    { value: 5/8, label: '5/8' },
    { value: 11/16, label: '11/16' },
    { value: 3/4, label: '3/4' },
    { value: 13/16, label: '13/16' },
    { value: 7/8, label: '7/8' },
    { value: 15/16, label: '15/16' },
  ];
  
  const closestFraction = fractions.reduce((prev, curr) => {
    return Math.abs(curr.value - fractionalInches) < Math.abs(prev.value - fractionalInches) ? curr : prev;
  });
  
  return {
    feet,
    inches,
    fraction: closestFraction.label,
  };
}

/**
 * Validate complete dimension data
 */
export function validateDimension(dimension) {
  const errors = [];

  // Validate measurement type
  const typeValidation = validateMeasurementType(dimension.measurement_type);
  if (!typeValidation.valid) {
    errors.push(typeValidation.error);
  }

  // Check benchmark requirement
  if (requiresBenchmark(dimension.measurement_type) && !dimension.benchmark_id) {
    errors.push(`Measurement type ${dimension.measurement_type} requires a benchmark`);
  }

  // Validate numeric values based on unit system
  if (dimension.unit_system === 'imperial') {
    const valueValidation = validateImperialValue(
      dimension.value_feet,
      dimension.value_inches,
      dimension.value_fraction
    );
    if (!valueValidation.valid) {
      errors.push(...valueValidation.errors);
    }
  } else if (dimension.unit_system === 'metric') {
    const valueValidation = validateMetricValue(dimension.value_mm);
    if (!valueValidation.valid) {
      errors.push(...valueValidation.errors);
    }
  }

  // Required fields
  if (!dimension.job_id) {
    errors.push('Job ID is required');
  }
  if (!dimension.area) {
    errors.push('Area is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize dimension input (remove non-numeric values, enforce constraints)
 */
export function sanitizeDimensionInput(dimension) {
  const sanitized = { ...dimension };

  // Ensure measurement type is from allowed list
  if (sanitized.measurement_type && !MEASUREMENT_TYPES[sanitized.measurement_type]) {
    delete sanitized.measurement_type;
  }

  // Sanitize imperial values
  if (sanitized.unit_system === 'imperial') {
    if (sanitized.value_feet !== undefined) {
      sanitized.value_feet = Math.max(0, Number(sanitized.value_feet) || 0);
    }
    if (sanitized.value_inches !== undefined) {
      sanitized.value_inches = Math.max(0, Math.min(11, Number(sanitized.value_inches) || 0));
    }
  }

  // Sanitize metric values
  if (sanitized.unit_system === 'metric') {
    if (sanitized.value_mm !== undefined) {
      sanitized.value_mm = Math.max(0, Number(sanitized.value_mm) || 0);
    }
  }

  return sanitized;
}

/**
 * Format dimension for display
 */
export function formatDimensionDisplay(dimension) {
  if (dimension.unit_system === 'imperial') {
    const parts = [];
    if (dimension.value_feet > 0) parts.push(`${dimension.value_feet}'`);
    if (dimension.value_inches > 0) parts.push(`${dimension.value_inches}"`);
    if (dimension.value_fraction && dimension.value_fraction !== '0') {
      parts.push(dimension.value_fraction + '"');
    }
    return parts.join(' ') || '0"';
  } else if (dimension.unit_system === 'metric') {
    return `${dimension.value_mm} mm`;
  }
  return 'N/A';
}