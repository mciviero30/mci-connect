/**
 * Factory Precision Rules
 * 
 * Enforces production-grade precision standards
 */

/**
 * Validate dimension precision
 */
export function validateDimensionPrecision(dimension) {
  const violations = [];
  
  // Rule 1: Must have exact imperial measurement
  if (!hasExactImperial(dimension)) {
    violations.push({
      rule: 'EXACT_IMPERIAL',
      severity: 'critical',
      message: 'Missing exact imperial measurement (feet + inches + fraction)',
      dimension_id: dimension.id
    });
  }
  
  // Rule 2: Fractions must be valid construction fractions (1/16 precision minimum)
  if (!hasValidFraction(dimension)) {
    violations.push({
      rule: 'VALID_FRACTION',
      severity: 'critical',
      message: 'Invalid or imprecise fraction - must be 1/16" precision minimum',
      dimension_id: dimension.id
    });
  }
  
  // Rule 3: Metric conversion must be precise (no rounding drift)
  if (!hasAccurateMetricConversion(dimension)) {
    violations.push({
      rule: 'METRIC_CONVERSION',
      severity: 'warning',
      message: 'Metric conversion may have rounding drift',
      dimension_id: dimension.id
    });
  }
  
  // Rule 4: Must have explicit measurement type label
  if (!hasExplicitMeasurementType(dimension)) {
    violations.push({
      rule: 'EXPLICIT_TYPE',
      severity: 'critical',
      message: 'Missing or ambiguous measurement type (must be FF-FF, CL-CL, etc.)',
      dimension_id: dimension.id
    });
  }
  
  // Rule 5: Face measurements must specify which face
  if (requiresFaceLabel(dimension) && !hasFaceLabel(dimension)) {
    violations.push({
      rule: 'FACE_LABEL',
      severity: 'critical',
      message: 'Finished face measurement missing explicit face label',
      dimension_id: dimension.id
    });
  }
  
  // Rule 6: Benchmark references must be explicit
  if (requiresBenchmark(dimension) && !hasExplicitBenchmark(dimension)) {
    violations.push({
      rule: 'BENCHMARK_REFERENCE',
      severity: 'critical',
      message: 'Vertical measurement missing explicit benchmark reference',
      dimension_id: dimension.id
    });
  }
  
  return {
    is_valid: violations.length === 0,
    has_critical: violations.some(v => v.severity === 'critical'),
    violations
  };
}

/**
 * Check if dimension has exact imperial measurement
 */
function hasExactImperial(dim) {
  // Must have feet OR inches (or both)
  const hasFeet = dim.value_feet !== undefined && dim.value_feet !== null;
  const hasInches = dim.value_inches !== undefined && dim.value_inches !== null;
  const hasFraction = dim.value_fraction !== undefined && dim.value_fraction !== null;
  
  return (hasFeet || hasInches) && hasFraction;
}

/**
 * Check if fraction is valid
 */
function hasValidFraction(dim) {
  if (!dim.value_fraction) return false;
  
  // Valid construction fractions (1/16" precision)
  const validFractions = [
    '0', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16',
    '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16'
  ];
  
  return validFractions.includes(dim.value_fraction);
}

/**
 * Check metric conversion accuracy
 */
function hasAccurateMetricConversion(dim) {
  if (!dim.value_mm) return false;
  
  // Calculate expected metric from imperial
  const totalInches = (dim.value_feet || 0) * 12 + (dim.value_inches || 0);
  const fractionValue = parseFraction(dim.value_fraction || '0');
  const totalInchesWithFraction = totalInches + fractionValue;
  const expectedMm = totalInchesWithFraction * 25.4;
  
  // Allow 0.5mm tolerance for rounding
  const diff = Math.abs(dim.value_mm - expectedMm);
  return diff <= 0.5;
}

/**
 * Parse fraction to decimal
 */
function parseFraction(fraction) {
  if (!fraction || fraction === '0') return 0;
  const parts = fraction.split('/');
  if (parts.length !== 2) return 0;
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

/**
 * Check if measurement type is explicit
 */
function hasExplicitMeasurementType(dim) {
  const validTypes = ['FF-FF', 'FF-CL', 'CL-FF', 'CL-CL', 'BM-C', 'BM-F', 'F-C', 'BM'];
  return validTypes.includes(dim.measurement_type);
}

/**
 * Check if dimension requires face label
 */
function requiresFaceLabel(dim) {
  return dim.measurement_type?.includes('FF');
}

/**
 * Check if dimension has face label
 */
function hasFaceLabel(dim) {
  // Check if production notes or area contains face identification
  const hasLabel = dim.production_notes?.toLowerCase().includes('face') ||
                   dim.notes?.toLowerCase().includes('face');
  return hasLabel;
}

/**
 * Check if dimension requires benchmark
 */
function requiresBenchmark(dim) {
  const verticalTypes = ['BM-C', 'BM-F', 'F-C', 'BM'];
  return verticalTypes.includes(dim.measurement_type);
}

/**
 * Check if dimension has explicit benchmark
 */
function hasExplicitBenchmark(dim) {
  return !!(dim.benchmark_id && dim.benchmark_label);
}

/**
 * Validate production group
 */
export function validateGroupPrecision(group) {
  const allResults = group.dimensions.map(validateDimensionPrecision);
  
  const violations = allResults.flatMap(r => r.violations);
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  
  return {
    is_valid: violations.length === 0,
    has_critical: criticalCount > 0,
    critical_count: criticalCount,
    warning_count: violations.filter(v => v.severity === 'warning').length,
    violations,
    can_export: criticalCount === 0
  };
}

/**
 * Format dimension with explicit labels
 */
export function formatDimensionWithLabels(dimension) {
  // Imperial with explicit unit
  const feet = dimension.value_feet || 0;
  const inches = dimension.value_inches || 0;
  const fraction = dimension.value_fraction || '0';
  
  let imperial = '';
  if (feet > 0) imperial += `${feet}' `;
  imperial += `${inches}`;
  if (fraction !== '0') imperial += ` ${fraction}`;
  imperial += '"';
  
  // Metric with explicit unit
  const metric = dimension.value_mm ? `${dimension.value_mm} mm` : 'N/A';
  
  // Measurement type label
  const typeLabel = getMeasurementTypeLabel(dimension.measurement_type);
  
  // Benchmark reference
  const benchmark = dimension.benchmark_label ? 
    `Referenced to BM: ${dimension.benchmark_label}` : null;
  
  return {
    imperial: imperial.trim(),
    metric,
    type_label: typeLabel,
    benchmark_reference: benchmark,
    explicit_display: `${imperial.trim()} (${metric}) ${typeLabel}${benchmark ? ` | ${benchmark}` : ''}`
  };
}

/**
 * Get measurement type label
 */
function getMeasurementTypeLabel(type) {
  const labels = {
    'FF-FF': 'Finish Face to Finish Face',
    'FF-CL': 'Finish Face to Center Line',
    'CL-FF': 'Center Line to Finish Face',
    'CL-CL': 'Center Line to Center Line',
    'BM-C': 'Benchmark to Ceiling',
    'BM-F': 'Benchmark to Floor',
    'F-C': 'Floor to Ceiling',
    'BM': 'Benchmark Elevation'
  };
  
  return labels[type] || type;
}

/**
 * Generate precision report
 */
export function generatePrecisionReport(dimensions) {
  const results = dimensions.map(validateDimensionPrecision);
  
  const totalViolations = results.flatMap(r => r.violations);
  const criticalViolations = totalViolations.filter(v => v.severity === 'critical');
  const warningViolations = totalViolations.filter(v => v.severity === 'warning');
  
  // Group by rule
  const violationsByRule = totalViolations.reduce((acc, v) => {
    if (!acc[v.rule]) {
      acc[v.rule] = [];
    }
    acc[v.rule].push(v);
    return acc;
  }, {});
  
  return {
    total_dimensions: dimensions.length,
    valid_dimensions: results.filter(r => r.is_valid).length,
    dimensions_with_violations: results.filter(r => !r.is_valid).length,
    
    critical_count: criticalViolations.length,
    warning_count: warningViolations.length,
    
    can_export: criticalViolations.length === 0,
    
    violations_by_rule: violationsByRule,
    
    summary: criticalViolations.length === 0 ? 
      'All precision rules passed' :
      `${criticalViolations.length} critical violation(s) blocking production export`
  };
}