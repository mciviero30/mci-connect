/**
 * Business Rules Engine for Field Dimensions
 * 
 * Enforces domain-specific rules and constraints
 */

import { convertToInches } from './DimensionValidationService';

/**
 * Rule: Wall measurements must maintain geometric consistency
 */
export function checkWallGeometry(dimensions, area) {
  const warnings = [];
  const areaDimensions = dimensions.filter(d => d.area === area);
  
  const ffFF = areaDimensions.find(d => d.measurement_type === 'FF-FF');
  const ffCL = areaDimensions.find(d => d.measurement_type === 'FF-CL');
  const clFF = areaDimensions.find(d => d.measurement_type === 'CL-FF');
  const clCL = areaDimensions.find(d => d.measurement_type === 'CL-CL');
  
  // FF-FF should be the largest
  if (ffFF) {
    const ffFFValue = convertToInches(ffFF);
    
    if (ffCL) {
      const ffCLValue = convertToInches(ffCL);
      if (ffFFValue < ffCLValue) {
        warnings.push(`FF-FF (${ffFFValue.toFixed(2)}") should be >= FF-CL (${ffCLValue.toFixed(2)}")`);
      }
    }
    
    if (clFF) {
      const clFFValue = convertToInches(clFF);
      if (ffFFValue < clFFValue) {
        warnings.push(`FF-FF (${ffFFValue.toFixed(2)}") should be >= CL-FF (${clFFValue.toFixed(2)}")`);
      }
    }
    
    if (clCL) {
      const clCLValue = convertToInches(clCL);
      if (ffFFValue < clCLValue) {
        warnings.push(`FF-FF (${ffFFValue.toFixed(2)}") should be >= CL-CL (${clCLValue.toFixed(2)}")`);
      }
    }
  }
  
  // CL-CL should be the smallest
  if (clCL) {
    const clCLValue = convertToInches(clCL);
    
    if (ffCL) {
      const ffCLValue = convertToInches(ffCL);
      if (clCLValue > ffCLValue) {
        warnings.push(`CL-CL (${clCLValue.toFixed(2)}") should be <= FF-CL (${ffCLValue.toFixed(2)}")`);
      }
    }
    
    if (clFF) {
      const clFFValue = convertToInches(clFF);
      if (clCLValue > clFFValue) {
        warnings.push(`CL-CL (${clCLValue.toFixed(2)}") should be <= CL-FF (${clFFValue.toFixed(2)}")`);
      }
    }
  }
  
  return warnings;
}

/**
 * Rule: Vertical measurements must be consistent with building standards
 */
export function checkVerticalStandards(dimension) {
  const warnings = [];
  const type = dimension.measurement_type;
  const value = convertToInches(dimension);
  
  // Standard ceiling heights: 8', 9', 10', 12'
  const standardHeights = [96, 108, 120, 144]; // in inches
  
  if (type === 'F-C') {
    // Check if close to standard height
    const closestStandard = standardHeights.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    
    const deviation = Math.abs(value - closestStandard);
    
    if (deviation > 3 && deviation < 12) {
      warnings.push(
        `Floor-to-ceiling height (${value.toFixed(2)}") deviates from standard ${closestStandard}" by ${deviation.toFixed(2)}"`
      );
    }
  }
  
  return warnings;
}

/**
 * Rule: Production tolerance requirements
 */
export function checkProductionTolerance(dimension) {
  const warnings = [];
  const errors = [];
  
  const tolerance = dimension.tolerance;
  
  if (!tolerance) {
    warnings.push('No tolerance specified - defaulting to ±1/8"');
    return { errors, warnings };
  }
  
  // Check if tolerance is within acceptable range
  const maxTolerance = 0.25; // ±1/4" maximum
  const minTolerance = 0.03125; // ±1/32" minimum
  
  if (tolerance.plus > maxTolerance || tolerance.minus > maxTolerance) {
    warnings.push(`Tolerance exceeds maximum ±1/4" (specified: +${tolerance.plus}", -${tolerance.minus}")`);
  }
  
  if (tolerance.plus < minTolerance || tolerance.minus < minTolerance) {
    warnings.push(`Tolerance is very tight (<±1/32") - may increase production cost`);
  }
  
  // Check if asymmetric tolerance is justified
  if (Math.abs(tolerance.plus - tolerance.minus) > 0.0625) { // >1/16" difference
    warnings.push('Asymmetric tolerance detected - verify if intentional');
  }
  
  return { errors, warnings };
}

/**
 * Rule: Material-specific constraints
 */
export function checkMaterialConstraints(dimension) {
  const warnings = [];
  const value = convertToInches(dimension);
  const material = dimension.material_type;
  
  if (!material) return warnings;
  
  // Glass panels: typically max 144" (12 feet)
  if (material.toLowerCase().includes('glass') && value > 144) {
    warnings.push(`Glass dimension exceeds typical maximum (144"). Current: ${value.toFixed(2)}"`);
  }
  
  // Metal panels: check for standard sheet sizes
  if (material.toLowerCase().includes('metal')) {
    const standardSheetLengths = [96, 120, 144]; // 8', 10', 12'
    const closestStandard = standardSheetLengths.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    
    if (value > closestStandard + 6) { // More than 6" over standard
      warnings.push(
        `Metal dimension (${value.toFixed(2)}") may require custom fabrication (nearest standard: ${closestStandard}")`
      );
    }
  }
  
  return warnings;
}

/**
 * Rule: Benchmark validation
 */
export function checkBenchmarkConsistency(dimension, benchmarks) {
  const warnings = [];
  const errors = [];
  
  if (['BM-C', 'BM-F', 'BM'].includes(dimension.measurement_type)) {
    if (!dimension.benchmark_id) {
      errors.push('Benchmark measurement requires a valid benchmark reference');
      return { errors, warnings };
    }
    
    const benchmark = benchmarks.find(b => b.id === dimension.benchmark_id);
    
    if (!benchmark) {
      errors.push('Referenced benchmark not found');
    } else if (!benchmark.is_active) {
      warnings.push('Referenced benchmark is no longer active');
    }
  }
  
  return { errors, warnings };
}

/**
 * Rule: Area consistency
 */
export function checkAreaConsistency(dimensions) {
  const warnings = [];
  
  // Group by area
  const byArea = dimensions.reduce((acc, d) => {
    if (!acc[d.area]) acc[d.area] = [];
    acc[d.area].push(d);
    return acc;
  }, {});
  
  // Check each area for completeness
  Object.entries(byArea).forEach(([area, areaDimensions]) => {
    const types = new Set(areaDimensions.map(d => d.measurement_type));
    
    // Recommend completing measurement sets
    if (types.has('BM-C') && !types.has('BM-F')) {
      warnings.push(`Area "${area}": Has BM-C but missing BM-F for complete vertical reference`);
    }
    
    if (types.has('FF-FF') && !types.has('CL-CL')) {
      warnings.push(`Area "${area}": Has FF-FF but missing CL-CL for complete wall measurement`);
    }
  });
  
  return warnings;
}

/**
 * Comprehensive business rules check
 */
export function applyBusinessRules(dimension, allDimensions = [], benchmarks = []) {
  const results = {
    errors: [],
    warnings: []
  };
  
  // Wall geometry rules
  if (['FF-FF', 'FF-CL', 'CL-FF', 'CL-CL'].includes(dimension.measurement_type)) {
    const geometryWarnings = checkWallGeometry(allDimensions, dimension.area);
    results.warnings.push(...geometryWarnings);
  }
  
  // Vertical standards
  if (['BM-C', 'BM-F', 'F-C'].includes(dimension.measurement_type)) {
    const standardsWarnings = checkVerticalStandards(dimension);
    results.warnings.push(...standardsWarnings);
  }
  
  // Production tolerance
  const toleranceCheck = checkProductionTolerance(dimension);
  results.errors.push(...toleranceCheck.errors);
  results.warnings.push(...toleranceCheck.warnings);
  
  // Material constraints
  const materialWarnings = checkMaterialConstraints(dimension);
  results.warnings.push(...materialWarnings);
  
  // Benchmark consistency
  const benchmarkCheck = checkBenchmarkConsistency(dimension, benchmarks);
  results.errors.push(...benchmarkCheck.errors);
  results.warnings.push(...benchmarkCheck.warnings);
  
  // Area consistency (global check)
  if (allDimensions.length > 0) {
    const areaWarnings = checkAreaConsistency([...allDimensions, dimension]);
    results.warnings.push(...areaWarnings);
  }
  
  return results;
}