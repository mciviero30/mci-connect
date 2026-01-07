/**
 * Pre-Flight Validation Engine for Field Dimensions
 * 
 * Runs comprehensive validation before production use
 * Does NOT block by default - generates warnings/errors for review
 */

import { APPROVAL_STATES } from './DimensionApprovalWorkflow';
import { convertToInches } from './DimensionValidationService';

/**
 * Validation severity levels
 */
export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Validation warning codes
 */
export const WARNING_CODES = {
  // Measurement consistency
  INCONSISTENT_FF_CL: 'inconsistent_ff_cl',
  MISSING_CENTERLINE: 'missing_centerline',
  IMPOSSIBLE_RELATIONSHIP: 'impossible_relationship',
  
  // Benchmark completeness
  MISSING_BENCHMARK: 'missing_benchmark',
  INCOMPLETE_VERTICAL: 'incomplete_vertical',
  ORPHAN_BENCHMARK_REF: 'orphan_benchmark_ref',
  
  // Physical plausibility
  NEGATIVE_VALUE: 'negative_value',
  IMPOSSIBLE_VALUE: 'impossible_value',
  SUSPICIOUS_LARGE: 'suspicious_large',
  SUSPICIOUS_SMALL: 'suspicious_small',
  
  // Business rules
  TOLERANCE_EXCEEDED: 'tolerance_exceeded',
  MISSING_REQUIRED_AREA: 'missing_required_area',
  DUPLICATE_MEASUREMENT: 'duplicate_measurement',
  
  // Approval readiness
  INSUFFICIENT_APPROVAL: 'insufficient_approval',
  NOT_VERIFIED: 'not_verified',
  MISSING_METADATA: 'missing_metadata'
};

/**
 * Run full pre-flight validation
 */
export async function runPreFlightValidation(dimensionSet, dimensions, benchmarks = [], options = {}) {
  const warnings = [];
  
  // Category 1: Measurement Consistency
  warnings.push(...validateMeasurementConsistency(dimensions));
  
  // Category 2: Benchmark Completeness
  warnings.push(...validateBenchmarkCompleteness(dimensions, benchmarks));
  
  // Category 3: Physical Plausibility
  warnings.push(...validatePhysicalPlausibility(dimensions));
  
  // Category 4: Business Rules
  warnings.push(...validateBusinessRules(dimensions, options.businessRules));
  
  // Category 5: Approval Readiness
  warnings.push(...validateApprovalReadiness(dimensionSet, dimensions));
  
  // Generate summary
  const summary = generateValidationSummary(warnings);
  
  // Create validation result
  const validationResult = {
    dimension_set_id: dimensionSet.id,
    validated_at: new Date().toISOString(),
    total_warnings: warnings.length,
    critical_count: warnings.filter(w => w.severity === SEVERITY.CRITICAL).length,
    warning_count: warnings.filter(w => w.severity === SEVERITY.WARNING).length,
    info_count: warnings.filter(w => w.severity === SEVERITY.INFO).length,
    passed: warnings.filter(w => w.severity === SEVERITY.CRITICAL).length === 0,
    warnings,
    summary,
    offline_validated: !navigator.onLine
  };
  
  return validationResult;
}

/**
 * Validate measurement consistency (FF-FF >= CL-CL logic)
 */
function validateMeasurementConsistency(dimensions) {
  const warnings = [];
  
  // Group by area and measurement type
  const byArea = {};
  dimensions.forEach(dim => {
    if (!byArea[dim.area]) byArea[dim.area] = [];
    byArea[dim.area].push(dim);
  });
  
  Object.keys(byArea).forEach(area => {
    const areaDims = byArea[area];
    
    // Find FF-FF and CL-CL pairs
    const ffff = areaDims.filter(d => d.measurement_type === 'FF-FF');
    const clcl = areaDims.filter(d => d.measurement_type === 'CL-CL');
    
    ffff.forEach(ff => {
      const matchingCL = clcl.find(cl => 
        Math.abs(convertToInches(cl) - convertToInches(ff)) < 24 // Within 2 feet
      );
      
      if (matchingCL) {
        const ffInches = convertToInches(ff);
        const clInches = convertToInches(matchingCL);
        
        if (clInches > ffInches) {
          warnings.push({
            code: WARNING_CODES.INCONSISTENT_FF_CL,
            severity: SEVERITY.CRITICAL,
            message: `CL-CL (${clInches.toFixed(2)}") is larger than FF-FF (${ffInches.toFixed(2)}") in area ${area}`,
            affected_dimensions: [ff.id, matchingCL.id],
            suggested_action: 'Verify measurements - FF-FF should be greater than or equal to CL-CL'
          });
        }
      }
    });
    
    // Check for mixed FF/CL without pairs
    const hasFF = areaDims.some(d => d.measurement_type.includes('FF'));
    const hasCL = areaDims.some(d => d.measurement_type.includes('CL'));
    
    if (hasFF && !hasCL) {
      warnings.push({
        code: WARNING_CODES.MISSING_CENTERLINE,
        severity: SEVERITY.WARNING,
        message: `Area ${area} has FF measurements but no CL reference`,
        affected_dimensions: areaDims.filter(d => d.measurement_type.includes('FF')).map(d => d.id),
        suggested_action: 'Consider adding centerline measurements for production reference'
      });
    }
  });
  
  return warnings;
}

/**
 * Validate benchmark completeness
 */
function validateBenchmarkCompleteness(dimensions, benchmarks) {
  const warnings = [];
  
  // Check for BM-referenced dimensions without benchmark
  const bmDimensions = dimensions.filter(d => 
    d.measurement_type.startsWith('BM-') || d.benchmark_id
  );
  
  bmDimensions.forEach(dim => {
    if (dim.benchmark_id) {
      const benchmark = benchmarks.find(bm => bm.id === dim.benchmark_id);
      
      if (!benchmark) {
        warnings.push({
          code: WARNING_CODES.ORPHAN_BENCHMARK_REF,
          severity: SEVERITY.CRITICAL,
          message: `Dimension references missing benchmark ${dim.benchmark_id}`,
          affected_dimensions: [dim.id],
          suggested_action: 'Verify benchmark exists or remove benchmark reference'
        });
      }
    } else if (dim.measurement_type.startsWith('BM-')) {
      warnings.push({
        code: WARNING_CODES.MISSING_BENCHMARK,
        severity: SEVERITY.WARNING,
        message: `Benchmark measurement without benchmark reference: ${dim.measurement_type}`,
        affected_dimensions: [dim.id],
        suggested_action: 'Link to benchmark record for traceability'
      });
    }
  });
  
  // Check for incomplete vertical sets (BM-C without BM-F)
  const byArea = {};
  dimensions.forEach(dim => {
    if (!byArea[dim.area]) byArea[dim.area] = [];
    byArea[dim.area].push(dim);
  });
  
  Object.keys(byArea).forEach(area => {
    const areaDims = byArea[area];
    const hasBMC = areaDims.some(d => d.measurement_type === 'BM-C');
    const hasBMF = areaDims.some(d => d.measurement_type === 'BM-F');
    
    if (hasBMC && !hasBMF) {
      warnings.push({
        code: WARNING_CODES.INCOMPLETE_VERTICAL,
        severity: SEVERITY.WARNING,
        message: `Area ${area} has BM-C but missing BM-F`,
        affected_dimensions: areaDims.filter(d => d.measurement_type === 'BM-C').map(d => d.id),
        suggested_action: 'Add BM-F measurement for complete vertical reference'
      });
    }
  });
  
  return warnings;
}

/**
 * Validate physical plausibility
 */
function validatePhysicalPlausibility(dimensions) {
  const warnings = [];
  
  dimensions.forEach(dim => {
    const inches = convertToInches(dim);
    
    // Check for negative values
    if (inches < 0) {
      warnings.push({
        code: WARNING_CODES.NEGATIVE_VALUE,
        severity: SEVERITY.CRITICAL,
        message: `Negative dimension value: ${inches.toFixed(2)}"`,
        affected_dimensions: [dim.id],
        suggested_action: 'Correct measurement - dimensions cannot be negative'
      });
    }
    
    // Check for impossible values (too large)
    if (inches > 1200) { // > 100 feet
      warnings.push({
        code: WARNING_CODES.IMPOSSIBLE_VALUE,
        severity: SEVERITY.CRITICAL,
        message: `Dimension exceeds 100 feet: ${inches.toFixed(2)}"`,
        affected_dimensions: [dim.id],
        suggested_action: 'Verify measurement - value seems unrealistic'
      });
    }
    
    // Check for suspicious large values
    if (dim.measurement_type.includes('FF') || dim.measurement_type.includes('CL')) {
      if (inches > 600) { // > 50 feet
        warnings.push({
          code: WARNING_CODES.SUSPICIOUS_LARGE,
          severity: SEVERITY.WARNING,
          message: `Unusually large dimension: ${inches.toFixed(2)}"`,
          affected_dimensions: [dim.id],
          suggested_action: 'Double-check measurement accuracy'
        });
      }
    }
    
    // Check for suspicious small values
    if (inches < 1 && inches > 0) {
      warnings.push({
        code: WARNING_CODES.SUSPICIOUS_SMALL,
        severity: SEVERITY.WARNING,
        message: `Very small dimension: ${inches.toFixed(3)}"`,
        affected_dimensions: [dim.id],
        suggested_action: 'Verify measurement - value seems too small'
      });
    }
    
    // Check vertical plausibility
    if (dim.measurement_type === 'BM-C' || dim.measurement_type === 'F-C') {
      if (inches < 72 || inches > 240) { // < 6ft or > 20ft
        warnings.push({
          code: WARNING_CODES.SUSPICIOUS_LARGE,
          severity: SEVERITY.WARNING,
          message: `Unusual ceiling height: ${inches.toFixed(2)}"`,
          affected_dimensions: [dim.id],
          suggested_action: 'Verify ceiling measurement'
        });
      }
    }
  });
  
  return warnings;
}

/**
 * Validate business rules
 */
function validateBusinessRules(dimensions, businessRules = {}) {
  const warnings = [];
  
  // Check for duplicate measurements (same area + type)
  const duplicateCheck = {};
  dimensions.forEach(dim => {
    const key = `${dim.area}_${dim.measurement_type}`;
    if (duplicateCheck[key]) {
      duplicateCheck[key].push(dim);
    } else {
      duplicateCheck[key] = [dim];
    }
  });
  
  Object.keys(duplicateCheck).forEach(key => {
    if (duplicateCheck[key].length > 1) {
      warnings.push({
        code: WARNING_CODES.DUPLICATE_MEASUREMENT,
        severity: SEVERITY.WARNING,
        message: `Duplicate measurements found: ${key.replace('_', ' ')}`,
        affected_dimensions: duplicateCheck[key].map(d => d.id),
        suggested_action: 'Review duplicates - keep most accurate or verified measurement'
      });
    }
  });
  
  // Check required areas (if configured)
  if (businessRules.requiredAreas && businessRules.requiredAreas.length > 0) {
    const presentAreas = [...new Set(dimensions.map(d => d.area))];
    const missingAreas = businessRules.requiredAreas.filter(area => !presentAreas.includes(area));
    
    missingAreas.forEach(area => {
      warnings.push({
        code: WARNING_CODES.MISSING_REQUIRED_AREA,
        severity: SEVERITY.CRITICAL,
        message: `Required area missing: ${area}`,
        affected_dimensions: [],
        suggested_action: `Add measurements for ${area} before production`
      });
    });
  }
  
  return warnings;
}

/**
 * Validate approval readiness
 */
function validateApprovalReadiness(dimensionSet, dimensions) {
  const warnings = [];
  
  // Check approval status
  const approvalStatus = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  
  if (approvalStatus === APPROVAL_STATES.DRAFT) {
    warnings.push({
      code: WARNING_CODES.INSUFFICIENT_APPROVAL,
      severity: SEVERITY.CRITICAL,
      message: 'Dimension set is in draft state',
      affected_dimensions: [],
      suggested_action: 'Submit for field verification before production use'
    });
  }
  
  if (approvalStatus === APPROVAL_STATES.FIELD_VERIFIED) {
    warnings.push({
      code: WARNING_CODES.INSUFFICIENT_APPROVAL,
      severity: SEVERITY.WARNING,
      message: 'Dimension set needs supervisor approval',
      affected_dimensions: [],
      suggested_action: 'Request supervisor approval before production'
    });
  }
  
  // Check for unverified dimensions
  const unverified = dimensions.filter(d => 
    d.status !== 'verified' && d.status !== 'production_ready'
  );
  
  if (unverified.length > 0) {
    warnings.push({
      code: WARNING_CODES.NOT_VERIFIED,
      severity: SEVERITY.WARNING,
      message: `${unverified.length} dimensions not verified`,
      affected_dimensions: unverified.map(d => d.id),
      suggested_action: 'Verify all dimensions before production'
    });
  }
  
  // Check for missing metadata
  const missingMetadata = dimensions.filter(d => 
    !d.measured_by || !d.measurement_date || !d.device_type
  );
  
  if (missingMetadata.length > 0) {
    warnings.push({
      code: WARNING_CODES.MISSING_METADATA,
      severity: SEVERITY.INFO,
      message: `${missingMetadata.length} dimensions missing metadata`,
      affected_dimensions: missingMetadata.map(d => d.id),
      suggested_action: 'Add measurer, date, and device type for traceability'
    });
  }
  
  return warnings;
}

/**
 * Generate validation summary
 */
function generateValidationSummary(warnings) {
  return {
    by_severity: {
      critical: warnings.filter(w => w.severity === SEVERITY.CRITICAL),
      warning: warnings.filter(w => w.severity === SEVERITY.WARNING),
      info: warnings.filter(w => w.severity === SEVERITY.INFO)
    },
    by_category: {
      measurement_consistency: warnings.filter(w => 
        [WARNING_CODES.INCONSISTENT_FF_CL, WARNING_CODES.MISSING_CENTERLINE, WARNING_CODES.IMPOSSIBLE_RELATIONSHIP].includes(w.code)
      ),
      benchmark_completeness: warnings.filter(w => 
        [WARNING_CODES.MISSING_BENCHMARK, WARNING_CODES.INCOMPLETE_VERTICAL, WARNING_CODES.ORPHAN_BENCHMARK_REF].includes(w.code)
      ),
      physical_plausibility: warnings.filter(w => 
        [WARNING_CODES.NEGATIVE_VALUE, WARNING_CODES.IMPOSSIBLE_VALUE, WARNING_CODES.SUSPICIOUS_LARGE, WARNING_CODES.SUSPICIOUS_SMALL].includes(w.code)
      ),
      business_rules: warnings.filter(w => 
        [WARNING_CODES.TOLERANCE_EXCEEDED, WARNING_CODES.MISSING_REQUIRED_AREA, WARNING_CODES.DUPLICATE_MEASUREMENT].includes(w.code)
      ),
      approval_readiness: warnings.filter(w => 
        [WARNING_CODES.INSUFFICIENT_APPROVAL, WARNING_CODES.NOT_VERIFIED, WARNING_CODES.MISSING_METADATA].includes(w.code)
      )
    }
  };
}

/**
 * Check if validation passes production gate
 */
export function passesProductionGate(validationResult, enforcementPolicy = {}) {
  // Default: block only critical
  const blockOnCritical = enforcementPolicy.blockOnCritical !== false;
  const blockOnWarning = enforcementPolicy.blockOnWarning === true;
  
  if (blockOnCritical && validationResult.critical_count > 0) {
    return {
      passed: false,
      reason: 'Critical validation errors found',
      critical_count: validationResult.critical_count
    };
  }
  
  if (blockOnWarning && validationResult.warning_count > 0) {
    return {
      passed: false,
      reason: 'Validation warnings found',
      warning_count: validationResult.warning_count
    };
  }
  
  return { passed: true };
}

/**
 * Store validation result with dimension set
 */
export function formatValidationSnapshot(validationResult) {
  return {
    validated_at: validationResult.validated_at,
    passed: validationResult.passed,
    total_warnings: validationResult.total_warnings,
    critical_count: validationResult.critical_count,
    warning_count: validationResult.warning_count,
    info_count: validationResult.info_count,
    offline_validated: validationResult.offline_validated,
    summary: validationResult.summary
  };
}