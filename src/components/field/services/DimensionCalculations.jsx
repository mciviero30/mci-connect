/**
 * Dimension Calculations and Conversions
 * Handles all dimension math, unit conversions, and validations
 */

/**
 * Convert imperial (feet, inches, fraction) to total inches
 */
export function imperialToInches(feet, inches, fraction) {
  const fractionValue = parseFraction(fraction);
  return (feet * 12) + inches + fractionValue;
}

/**
 * Convert inches to millimeters
 */
export function inchesToMm(inches) {
  return inches * 25.4;
}

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm) {
  return mm / 25.4;
}

/**
 * Convert total inches to imperial components
 */
export function inchesToImperial(totalInches) {
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches - (feet * 12);
  const inches = Math.floor(remainingInches);
  const decimal = remainingInches - inches;
  
  // Find closest fraction
  const fraction = decimalToFraction(decimal);
  
  return { feet, inches, fraction };
}

/**
 * Parse fraction string to decimal
 */
export function parseFraction(fractionStr) {
  if (!fractionStr || fractionStr === '0') return 0;
  
  const parts = fractionStr.split('/');
  if (parts.length !== 2) return 0;
  
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

/**
 * Convert decimal to nearest 1/16" fraction
 */
export function decimalToFraction(decimal) {
  const sixteenths = Math.round(decimal * 16);
  
  if (sixteenths === 0) return '0';
  if (sixteenths === 16) return '1';
  
  // Simplify fraction
  const fractions = {
    1: '1/16', 2: '1/8', 3: '3/16', 4: '1/4',
    5: '5/16', 6: '3/8', 7: '7/16', 8: '1/2',
    9: '9/16', 10: '5/8', 11: '11/16', 12: '3/4',
    13: '13/16', 14: '7/8', 15: '15/16'
  };
  
  return fractions[sixteenths] || '0';
}

/**
 * Format dimension for display
 */
export function formatDimension(dimension) {
  if (dimension.unit_system === 'imperial') {
    const feet = dimension.value_feet || 0;
    const inches = dimension.value_inches || 0;
    const fraction = dimension.value_fraction || '0';
    
    let display = '';
    if (feet > 0) display += `${feet}'`;
    if (inches > 0 || fraction !== '0') {
      display += ` ${inches}`;
      if (fraction !== '0') display += ` ${fraction}`;
      display += '"';
    }
    
    return display.trim() || '0"';
  } else {
    return `${dimension.value_mm || 0} mm`;
  }
}

/**
 * Calculate total dimension in consistent unit (inches)
 */
export function getTotalInches(dimension) {
  if (dimension.unit_system === 'imperial') {
    return imperialToInches(
      dimension.value_feet || 0,
      dimension.value_inches || 0,
      dimension.value_fraction || '0'
    );
  } else {
    return mmToInches(dimension.value_mm || 0);
  }
}

/**
 * Calculate total dimension in millimeters
 */
export function getTotalMm(dimension) {
  const inches = getTotalInches(dimension);
  return inchesToMm(inches);
}

/**
 * Validate dimension data
 */
export function validateDimension(dimension) {
  const errors = [];
  
  if (!dimension.job_id) {
    errors.push('Job ID is required');
  }
  
  if (!dimension.area) {
    errors.push('Area/location is required');
  }
  
  if (!dimension.measurement_type) {
    errors.push('Measurement type is required');
  }
  
  // Validate value exists
  if (dimension.unit_system === 'imperial') {
    const totalInches = imperialToInches(
      dimension.value_feet || 0,
      dimension.value_inches || 0,
      dimension.value_fraction || '0'
    );
    if (totalInches <= 0) {
      errors.push('Measurement value must be greater than 0');
    }
  } else {
    if (!dimension.value_mm || dimension.value_mm <= 0) {
      errors.push('Measurement value must be greater than 0');
    }
  }
  
  // Validate benchmark reference if needed
  if (['BM-C', 'BM-F'].includes(dimension.measurement_type)) {
    if (!dimension.benchmark_id && !dimension.benchmark_label) {
      errors.push('Benchmark reference required for this measurement type');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Apply tolerance to dimension
 */
export function applyTolerance(dimension, tolerancePlus, toleranceMinus) {
  const baseValue = getTotalInches(dimension);
  
  return {
    nominal: baseValue,
    max: baseValue + (tolerancePlus || 0),
    min: baseValue - (toleranceMinus || 0)
  };
}

/**
 * Compare two dimensions (for verification)
 */
export function compareDimensions(dim1, dim2) {
  const value1 = getTotalInches(dim1);
  const value2 = getTotalInches(dim2);
  
  const difference = Math.abs(value1 - value2);
  const percentDiff = (difference / value1) * 100;
  
  return {
    difference,
    percentDiff,
    isWithinTolerance: difference <= 0.125 // 1/8" default tolerance
  };
}

/**
 * Calculate area from dimensions (for rectangular spaces)
 */
export function calculateArea(width, height) {
  const widthInches = getTotalInches(width);
  const heightInches = getTotalInches(height);
  
  const areaSquareInches = widthInches * heightInches;
  const areaSquareFeet = areaSquareInches / 144;
  
  return {
    squareInches: areaSquareInches,
    squareFeet: areaSquareFeet
  };
}

/**
 * Generate dimension summary for production
 */
export function generateProductionSummary(dimensions) {
  if (!dimensions || dimensions.length === 0) return null;
  
  const summary = {
    total_count: dimensions.length,
    by_type: {},
    by_area: {},
    unit_system: dimensions[0]?.unit_system || 'imperial'
  };
  
  dimensions.forEach(dim => {
    // Count by type
    summary.by_type[dim.measurement_type] = (summary.by_type[dim.measurement_type] || 0) + 1;
    
    // Count by area
    summary.by_area[dim.area] = (summary.by_area[dim.area] || 0) + 1;
  });
  
  return summary;
}