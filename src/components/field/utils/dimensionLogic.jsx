/**
 * Field Dimensions Logic & Validation
 * Single source of truth for dimension rules, colors, and validation
 */

// ============================================
// MEASUREMENT TYPES & COLORS
// ============================================

export const HORIZONTAL_TYPES = {
  FF_FF: { label: 'FF to FF', color: '#3B82F6', description: 'Finished Floor to Finished Floor' },
  FF_CL: { label: 'FF to CL', color: '#10B981', description: 'Finished Floor to Ceiling' },
  CL_FF: { label: 'CL to FF', color: '#F59E0B', description: 'Ceiling to Finished Floor' },
  CL_CL: { label: 'CL to CL', color: '#EF4444', description: 'Ceiling to Ceiling' }
};

export const VERTICAL_TYPES = {
  BM_C: { label: 'BM to C', color: '#8B5CF6', description: 'Benchmark to Ceiling' },
  BM_F: { label: 'BM to F', color: '#EC4899', description: 'Benchmark to Floor' },
  F_C: { label: 'F to C', color: '#06B6D4', description: 'Floor to Ceiling' }
};

export const BENCHMARK_TYPES = {
  LASER: { label: 'Laser Level', icon: '🔴', color: '#EF4444' },
  FLOOR_MARK: { label: 'Floor Mark', icon: '📍', color: '#3B82F6' }
};

export const UNITS = {
  in: { label: 'Inches', symbol: '"', default: true },
  mm: { label: 'Millimeters', symbol: 'mm', default: false }
};

// ============================================
// COLOR DERIVATION
// ============================================

/**
 * Get color for a measurement type (IMMUTABLE)
 * @param {string} type - Measurement type
 * @param {string} entity - 'horizontal' or 'vertical'
 * @returns {string} Hex color code
 */
export function getDimensionColor(type, entity = 'horizontal') {
  if (entity === 'horizontal') {
    return HORIZONTAL_TYPES[type]?.color || '#6B7280';
  }
  if (entity === 'vertical') {
    return VERTICAL_TYPES[type]?.color || '#6B7280';
  }
  return '#6B7280';
}

/**
 * Get benchmark color
 * @param {string} type - LASER or FLOOR_MARK
 * @returns {string} Hex color code
 */
export function getBenchmarkColor(type) {
  return BENCHMARK_TYPES[type]?.color || '#6B7280';
}

// ============================================
// VALIDATION RULES
// ============================================

/**
 * Validate FieldDimension data (HARD FAILURES)
 * @throws {Error} Validation error with specific message
 */
export function validateFieldDimension(data) {
  // Required fields
  if (!data.project_id) {
    throw new Error('Project ID is required');
  }
  
  if (!data.measurement_type) {
    throw new Error('Measurement type is required');
  }
  
  // Type must be valid horizontal type
  if (!HORIZONTAL_TYPES[data.measurement_type]) {
    throw new Error(`Invalid measurement type: ${data.measurement_type}. Must be one of: ${Object.keys(HORIZONTAL_TYPES).join(', ')}`);
  }
  
  // Value validation
  if (typeof data.value !== 'number') {
    throw new Error('Measurement value must be a number');
  }
  
  if (data.value <= 0) {
    throw new Error('Measurement value must be greater than 0');
  }
  
  // Unit validation
  if (!data.unit) {
    throw new Error('Unit is required');
  }
  
  if (!UNITS[data.unit]) {
    throw new Error(`Invalid unit: ${data.unit}. Must be one of: ${Object.keys(UNITS).join(', ')}`);
  }
  
  return true;
}

/**
 * Validate VerticalMeasurement data (HARD FAILURES)
 * @throws {Error} Validation error with specific message
 */
export function validateVerticalMeasurement(data) {
  // Required fields
  if (!data.project_id) {
    throw new Error('Project ID is required');
  }
  
  if (!data.benchmark_id) {
    throw new Error('Benchmark ID is required for vertical measurements');
  }
  
  if (!data.type) {
    throw new Error('Measurement type is required');
  }
  
  // Type must be valid vertical type
  if (!VERTICAL_TYPES[data.type]) {
    throw new Error(`Invalid measurement type: ${data.type}. Must be one of: ${Object.keys(VERTICAL_TYPES).join(', ')}`);
  }
  
  // Value validation
  if (typeof data.value !== 'number') {
    throw new Error('Measurement value must be a number');
  }
  
  if (data.value <= 0) {
    throw new Error('Measurement value must be greater than 0');
  }
  
  // Unit validation
  if (!data.unit) {
    throw new Error('Unit is required');
  }
  
  if (!UNITS[data.unit]) {
    throw new Error(`Invalid unit: ${data.unit}. Must be one of: ${Object.keys(UNITS).join(', ')}`);
  }
  
  return true;
}

/**
 * Validate Benchmark data
 * @throws {Error} Validation error with specific message
 */
export function validateBenchmark(data) {
  if (!data.project_id) {
    throw new Error('Project ID is required');
  }
  
  if (!data.label || data.label.trim() === '') {
    throw new Error('Benchmark label is required');
  }
  
  if (!data.type) {
    throw new Error('Benchmark type is required');
  }
  
  if (!BENCHMARK_TYPES[data.type]) {
    throw new Error(`Invalid benchmark type: ${data.type}. Must be one of: ${Object.keys(BENCHMARK_TYPES).join(', ')}`);
  }
  
  return true;
}

// ============================================
// TYPE CHECKING
// ============================================

/**
 * Check if a measurement type is horizontal
 */
export function isHorizontalType(type) {
  return type in HORIZONTAL_TYPES;
}

/**
 * Check if a measurement type is vertical
 */
export function isVerticalType(type) {
  return type in VERTICAL_TYPES;
}

/**
 * Prevent mixing horizontal and vertical types
 * @throws {Error} If types are mixed
 */
export function validateTypeMixing(type1, type2) {
  const type1IsHorizontal = isHorizontalType(type1);
  const type2IsHorizontal = isHorizontalType(type2);
  
  if (type1IsHorizontal !== type2IsHorizontal) {
    throw new Error('Cannot mix horizontal and vertical measurement types');
  }
  
  return true;
}

// ============================================
// DATA PREPARATION
// ============================================

/**
 * Prepare FieldDimension for save (adds derived fields)
 * @param {Object} data - Raw dimension data
 * @returns {Object} Data with derived color
 */
export function prepareFieldDimension(data) {
  validateFieldDimension(data);
  
  return {
    ...data,
    color: getDimensionColor(data.measurement_type, 'horizontal'),
    unit: data.unit || 'in' // Default to inches
  };
}

/**
 * Prepare VerticalMeasurement for save (adds derived fields)
 * @param {Object} data - Raw measurement data
 * @returns {Object} Data with derived color
 */
export function prepareVerticalMeasurement(data) {
  validateVerticalMeasurement(data);
  
  return {
    ...data,
    color: getDimensionColor(data.type, 'vertical'),
    unit: data.unit || 'in' // Default to inches
  };
}

/**
 * Prepare Benchmark for save (adds derived fields)
 * @param {Object} data - Raw benchmark data
 * @returns {Object} Data with derived color
 */
export function prepareBenchmark(data) {
  validateBenchmark(data);
  
  return {
    ...data,
    color: getBenchmarkColor(data.type)
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Format measurement value with unit
 * @param {number} value - Measurement value
 * @param {string} unit - in or mm
 * @returns {string} Formatted string (e.g., "96.5"" or "2450mm")
 */
export function formatMeasurement(value, unit = 'in') {
  const unitSymbol = UNITS[unit]?.symbol || unit;
  return `${value}${unitSymbol}`;
}

/**
 * Get measurement type label
 * @param {string} type - Measurement type
 * @param {string} entity - 'horizontal' or 'vertical'
 * @returns {string} Human-readable label
 */
export function getMeasurementLabel(type, entity = 'horizontal') {
  if (entity === 'horizontal') {
    return HORIZONTAL_TYPES[type]?.label || type;
  }
  if (entity === 'vertical') {
    return VERTICAL_TYPES[type]?.label || type;
  }
  return type;
}

/**
 * Get measurement type description
 * @param {string} type - Measurement type
 * @param {string} entity - 'horizontal' or 'vertical'
 * @returns {string} Description
 */
export function getMeasurementDescription(type, entity = 'horizontal') {
  if (entity === 'horizontal') {
    return HORIZONTAL_TYPES[type]?.description || '';
  }
  if (entity === 'vertical') {
    return VERTICAL_TYPES[type]?.description || '';
  }
  return '';
}