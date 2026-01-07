/**
 * Dimension Validation Rules
 * Production-ready validation for field measurements
 */

import { getTotalInches } from './DimensionCalculations';

/**
 * Validation rules for different measurement types
 */
const MEASUREMENT_RULES = {
  'FF-FF': {
    label: 'Floor to Floor',
    typical_range: { min: 96, max: 240 }, // 8' to 20' in inches
    requires_benchmark: false,
    dimension_type: 'vertical'
  },
  'FF-CL': {
    label: 'Floor to Ceiling',
    typical_range: { min: 96, max: 192 }, // 8' to 16' in inches
    requires_benchmark: false,
    dimension_type: 'vertical'
  },
  'CL-FF': {
    label: 'Ceiling to Floor',
    typical_range: { min: 96, max: 192 },
    requires_benchmark: false,
    dimension_type: 'vertical'
  },
  'CL-CL': {
    label: 'Ceiling to Ceiling',
    typical_range: { min: 96, max: 240 },
    requires_benchmark: false,
    dimension_type: 'vertical'
  },
  'BM-C': {
    label: 'Benchmark to Ceiling',
    typical_range: { min: 0, max: 240 },
    requires_benchmark: true,
    dimension_type: 'vertical'
  },
  'BM-F': {
    label: 'Benchmark to Floor',
    typical_range: { min: 0, max: 240 },
    requires_benchmark: true,
    dimension_type: 'vertical'
  },
  'F-C': {
    label: 'Floor to Ceiling',
    typical_range: { min: 96, max: 192 },
    requires_benchmark: false,
    dimension_type: 'vertical'
  }
};

/**
 * Validate dimension against business rules
 */
export function validateDimensionRules(dimension) {
  const warnings = [];
  const errors = [];
  
  // Get measurement rules
  const rules = MEASUREMENT_RULES[dimension.measurement_type];
  if (!rules) {
    errors.push(`Unknown measurement type: ${dimension.measurement_type}`);
    return { isValid: false, errors, warnings };
  }
  
  // Validate benchmark requirement
  if (rules.requires_benchmark) {
    if (!dimension.benchmark_id && !dimension.benchmark_label) {
      errors.push(`${rules.label} requires a benchmark reference`);
    }
  }
  
  // Validate dimension type matches
  if (dimension.dimension_type !== rules.dimension_type) {
    warnings.push(`Dimension type mismatch: ${rules.label} is typically ${rules.dimension_type}`);
  }
  
  // Validate value is within typical range
  const totalInches = getTotalInches(dimension);
  if (totalInches < rules.typical_range.min) {
    warnings.push(`Value ${formatInches(totalInches)} is below typical range for ${rules.label} (${formatInches(rules.typical_range.min)} min)`);
  }
  if (totalInches > rules.typical_range.max) {
    warnings.push(`Value ${formatInches(totalInches)} is above typical range for ${rules.label} (${formatInches(rules.typical_range.max)} max)`);
  }
  
  // Validate measuring device is appropriate
  if (dimension.device_type === 'manual' && totalInches > 144) {
    warnings.push('Manual measurement for lengths over 12\' should be verified with laser or digital device');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate production readiness
 */
export function validateProductionReady(dimension) {
  const errors = [];
  
  // Must be verified
  if (!dimension.verified_by) {
    errors.push('Dimension must be verified before production');
  }
  
  // Must have area
  if (!dimension.area) {
    errors.push('Area/location is required for production');
  }
  
  // Should have material type for production planning
  if (!dimension.material_type) {
    errors.push('Material type is required for production');
  }
  
  // Should have photos for reference
  if (!dimension.photo_urls || dimension.photo_urls.length === 0) {
    errors.push('At least one photo is recommended for production');
  }
  
  return {
    isReady: errors.length === 0,
    errors
  };
}

/**
 * Validate dimension set completeness
 */
export function validateDimensionSet(dimensions, expectedCount = null) {
  const errors = [];
  const warnings = [];
  
  if (!dimensions || dimensions.length === 0) {
    errors.push('Dimension set is empty');
    return { isComplete: false, errors, warnings };
  }
  
  // Check for unverified dimensions
  const unverified = dimensions.filter(d => !d.verified_by);
  if (unverified.length > 0) {
    warnings.push(`${unverified.length} dimensions are not verified`);
  }
  
  // Check for missing photos
  const noPhotos = dimensions.filter(d => !d.photo_urls || d.photo_urls.length === 0);
  if (noPhotos.length > 0) {
    warnings.push(`${noPhotos.length} dimensions missing photos`);
  }
  
  // Check expected count
  if (expectedCount && dimensions.length !== expectedCount) {
    warnings.push(`Expected ${expectedCount} dimensions, found ${dimensions.length}`);
  }
  
  // Check for duplicate measurements in same area
  const areaMap = new Map();
  dimensions.forEach(d => {
    const key = `${d.area}-${d.measurement_type}`;
    if (areaMap.has(key)) {
      warnings.push(`Duplicate ${d.measurement_type} measurement in ${d.area}`);
    }
    areaMap.set(key, true);
  });
  
  return {
    isComplete: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if dimension needs verification
 */
export function needsVerification(dimension) {
  // Already verified
  if (dimension.verified_by) return false;
  
  // Check if outside typical range
  const rules = MEASUREMENT_RULES[dimension.measurement_type];
  if (rules) {
    const totalInches = getTotalInches(dimension);
    if (totalInches < rules.typical_range.min || totalInches > rules.typical_range.max) {
      return true;
    }
  }
  
  // Manual measurements always need verification
  if (dimension.device_type === 'manual') {
    return true;
  }
  
  // Critical tags need verification
  if (dimension.tags && dimension.tags.includes('critical')) {
    return true;
  }
  
  return false;
}

/**
 * Format inches for display
 */
function formatInches(inches) {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  
  if (feet > 0) {
    return `${feet}' ${remainingInches.toFixed(1)}"`;
  }
  return `${remainingInches.toFixed(1)}"`;
}

/**
 * Validate tolerance specifications
 */
export function validateTolerance(tolerance) {
  const errors = [];
  
  if (!tolerance) return { isValid: true, errors };
  
  if (tolerance.plus < 0) {
    errors.push('Plus tolerance cannot be negative');
  }
  
  if (tolerance.minus < 0) {
    errors.push('Minus tolerance cannot be negative');
  }
  
  if (tolerance.plus > 1) {
    errors.push('Plus tolerance exceeds 1" (unusual - verify)');
  }
  
  if (tolerance.minus > 1) {
    errors.push('Minus tolerance exceeds 1" (unusual - verify)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}