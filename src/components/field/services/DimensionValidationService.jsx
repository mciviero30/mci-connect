/**
 * Advanced Validation and Business Rules for Field Dimensions
 * 
 * Implements:
 * - Measurement type validation (FF-FF, CL-CL, BM-C, etc.)
 * - Logical consistency checks
 * - Tolerance-based warnings
 * - Metadata enrichment
 */

// Default tolerance in inches
const DEFAULT_TOLERANCE = 0.125; // ±1/8"

/**
 * Convert dimension value to inches for comparison
 */
export function convertToInches(dimension) {
  if (dimension.unit_system === 'metric') {
    return dimension.value_mm / 25.4;
  }
  
  // Imperial - combine feet, inches, and fraction
  const feet = dimension.value_feet || 0;
  const inches = dimension.value_inches || 0;
  const fractionValue = parseFraction(dimension.value_fraction || '0');
  
  return (feet * 12) + inches + fractionValue;
}

/**
 * Parse fraction string to decimal inches
 */
function parseFraction(fractionStr) {
  if (!fractionStr || fractionStr === '0') return 0;
  
  const parts = fractionStr.split('/');
  if (parts.length !== 2) return 0;
  
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

/**
 * Validate measurement type rules
 */
export function validateMeasurementType(dimension) {
  const warnings = [];
  const errors = [];
  
  const type = dimension.measurement_type;
  const value = convertToInches(dimension);
  
  // Check for negative or zero values
  if (value <= 0) {
    errors.push('Measurement value must be positive');
    return { valid: false, errors, warnings };
  }
  
  // Check for unrealistic values
  if (type.includes('FF') || type.includes('CL')) {
    // Wall measurements - typically 0.5" to 240" (20 feet)
    if (value < 0.5) {
      warnings.push('Measurement seems too small (< 0.5")');
    }
    if (value > 240) {
      warnings.push('Measurement seems too large (> 20 feet)');
    }
  }
  
  if (type === 'BM-C' || type === 'BM-F' || type === 'F-C') {
    // Vertical measurements - typically 48" to 240" (4-20 feet)
    if (value < 48) {
      warnings.push('Vertical measurement seems too small (< 4 feet)');
    }
    if (value > 240) {
      warnings.push('Vertical measurement seems too large (> 20 feet)');
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate logical consistency between related measurements
 */
export function validateConsistency(dimensions, newDimension) {
  const warnings = [];
  const errors = [];
  
  const area = newDimension.area;
  const type = newDimension.measurement_type;
  
  // Find related measurements in the same area
  const relatedDimensions = dimensions.filter(d => d.area === area && d.id !== newDimension.id);
  
  // Rule 1: FF-FF >= CL-CL
  if (type === 'FF-FF') {
    const clCL = relatedDimensions.find(d => d.measurement_type === 'CL-CL');
    if (clCL) {
      const ffValue = convertToInches(newDimension);
      const clValue = convertToInches(clCL);
      
      if (ffValue < clValue) {
        warnings.push(`FF-FF (${ffValue.toFixed(2)}") should be >= CL-CL (${clValue.toFixed(2)}")`);
      }
    }
  }
  
  if (type === 'CL-CL') {
    const ffFF = relatedDimensions.find(d => d.measurement_type === 'FF-FF');
    if (ffFF) {
      const clValue = convertToInches(newDimension);
      const ffValue = convertToInches(ffFF);
      
      if (clValue > ffValue) {
        warnings.push(`CL-CL (${clValue.toFixed(2)}") should be <= FF-FF (${ffValue.toFixed(2)}")`);
      }
    }
  }
  
  // Rule 2: BM-C + BM-F ≈ F-C (with tolerance)
  if (type === 'BM-C' || type === 'BM-F' || type === 'F-C') {
    const bmC = type === 'BM-C' ? newDimension : relatedDimensions.find(d => d.measurement_type === 'BM-C');
    const bmF = type === 'BM-F' ? newDimension : relatedDimensions.find(d => d.measurement_type === 'BM-F');
    const fC = type === 'F-C' ? newDimension : relatedDimensions.find(d => d.measurement_type === 'F-C');
    
    if (bmC && bmF && fC) {
      const bmCValue = convertToInches(bmC);
      const bmFValue = convertToInches(bmF);
      const fCValue = convertToInches(fC);
      
      const sum = bmCValue + bmFValue;
      const diff = Math.abs(sum - fCValue);
      
      // Get tolerance (default ±1/8")
      const tolerance = newDimension.tolerance?.plus || DEFAULT_TOLERANCE;
      
      if (diff > tolerance) {
        warnings.push(
          `Vertical consistency check: BM-C (${bmCValue.toFixed(2)}") + BM-F (${bmFValue.toFixed(2)}") = ${sum.toFixed(2)}", ` +
          `but F-C is ${fCValue.toFixed(2)}" (difference: ${diff.toFixed(3)}", tolerance: ±${tolerance}")`
        );
      }
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Apply project-specific tolerances
 */
export function applyTolerance(dimension, projectSettings = {}) {
  const defaultTolerance = projectSettings.default_tolerance || DEFAULT_TOLERANCE;
  
  // If dimension doesn't have tolerance, apply default
  if (!dimension.tolerance) {
    return {
      ...dimension,
      tolerance: {
        plus: defaultTolerance,
        minus: defaultTolerance,
        unit: dimension.unit_system === 'metric' ? 'mm' : 'in'
      }
    };
  }
  
  return dimension;
}

/**
 * Enrich dimension with metadata
 */
export function enrichMetadata(dimension, context) {
  const now = new Date().toISOString();
  
  return {
    ...dimension,
    captured_by: context.user?.email || dimension.captured_by,
    captured_by_name: context.user?.full_name || dimension.captured_by_name,
    captured_at: dimension.captured_at || now,
    tool_type: dimension.device_type || 'laser', // Map device_type to tool_type
    unit_system: dimension.unit_system || 'imperial',
    language: context.language || navigator.language || 'en',
    captured_latitude: context.gps?.latitude,
    captured_longitude: context.gps?.longitude,
  };
}

/**
 * Comprehensive validation pipeline
 */
export function validateDimension(dimension, allDimensions = [], projectSettings = {}, context = {}) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    enrichedDimension: dimension
  };
  
  // Step 1: Apply tolerance
  let enrichedDimension = applyTolerance(dimension, projectSettings);
  
  // Step 2: Enrich metadata
  enrichedDimension = enrichMetadata(enrichedDimension, context);
  
  // Step 3: Validate measurement type
  const typeValidation = validateMeasurementType(enrichedDimension);
  results.errors.push(...typeValidation.errors);
  results.warnings.push(...typeValidation.warnings);
  
  // Step 4: Validate consistency with related measurements
  const consistencyValidation = validateConsistency(allDimensions, enrichedDimension);
  results.warnings.push(...consistencyValidation.warnings);
  
  // Step 5: Check if dimension requires benchmark
  if (['BM-C', 'BM-F', 'BM'].includes(enrichedDimension.measurement_type)) {
    if (!enrichedDimension.benchmark_id) {
      results.warnings.push('Benchmark measurement should reference a benchmark');
    }
  }
  
  results.valid = results.errors.length === 0;
  results.enrichedDimension = enrichedDimension;
  
  return results;
}

/**
 * Batch validation for multiple dimensions
 */
export function validateBatch(dimensions, projectSettings = {}, context = {}) {
  const results = [];
  
  for (const dimension of dimensions) {
    const validation = validateDimension(dimension, dimensions, projectSettings, context);
    results.push({
      dimension,
      validation
    });
  }
  
  return results;
}

/**
 * Get validation summary
 */
export function getValidationSummary(validationResults) {
  const totalErrors = validationResults.reduce((sum, r) => sum + r.validation.errors.length, 0);
  const totalWarnings = validationResults.reduce((sum, r) => sum + r.validation.warnings.length, 0);
  const valid = validationResults.every(r => r.validation.valid);
  
  return {
    valid,
    totalDimensions: validationResults.length,
    totalErrors,
    totalWarnings,
    errorRate: validationResults.length > 0 ? totalErrors / validationResults.length : 0,
    warningRate: validationResults.length > 0 ? totalWarnings / validationResults.length : 0
  };
}