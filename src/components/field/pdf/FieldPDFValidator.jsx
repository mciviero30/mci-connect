/**
 * Field PDF Validator
 * 
 * Validates data integrity before PDF generation
 */

/**
 * Validate dimension set for PDF export
 */
export function validateForPDFExport(dimensionSet, dimensions) {
  const errors = [];
  const warnings = [];
  
  // Dimension set validation
  if (!dimensionSet.workflow_state || dimensionSet.workflow_state === 'draft') {
    warnings.push('Dimension set is in draft status');
  }
  
  if (!dimensionSet.approved_by && !dimensionSet.is_locked) {
    warnings.push('Dimension set has not been approved');
  }
  
  if (dimensions.length === 0) {
    errors.push('No dimensions in set');
  }
  
  // Dimension validation
  dimensions.forEach((dim, idx) => {
    const dimId = dim.id || dim.local_id || `dimension_${idx}`;
    
    // Required fields
    if (!dim.measurement_type) {
      errors.push(`${dimId}: Missing measurement_type`);
    }
    
    if (!dim.unit_system) {
      errors.push(`${dimId}: Missing unit_system`);
    }
    
    if (!dim.area) {
      errors.push(`${dimId}: Missing area reference`);
    }
    
    // Value validation
    const hasImperialValue = dim.value_feet !== undefined || dim.value_inches !== undefined;
    const hasMetricValue = dim.value_mm !== undefined;
    
    if (!hasImperialValue && !hasMetricValue) {
      errors.push(`${dimId}: No measurement value`);
    }
    
    // Benchmark validation
    if (['BM-C', 'BM-F', 'F-C'].includes(dim.measurement_type)) {
      if (!dim.benchmark_id && !dim.benchmark_label) {
        warnings.push(`${dimId}: ${dim.measurement_type} should reference a benchmark`);
      }
    }
    
    // Status validation
    if (dim.status === 'draft') {
      warnings.push(`${dimId}: Dimension is in draft status`);
    }
  });
  
  return {
    valid: errors.length === 0,
    can_export: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

/**
 * Validate benchmark references
 */
export function validateBenchmarkReferences(dimensions, benchmarks) {
  const warnings = [];
  
  // Create benchmark lookup
  const benchmarkMap = {};
  benchmarks.forEach(bm => {
    benchmarkMap[bm.id || bm.local_id] = bm;
    if (bm.label) benchmarkMap[bm.label] = bm;
  });
  
  // Check each dimension's benchmark reference
  dimensions.forEach(dim => {
    if (dim.benchmark_id) {
      if (!benchmarkMap[dim.benchmark_id]) {
        warnings.push(`Dimension ${dim.local_id} references missing benchmark ${dim.benchmark_id}`);
      }
    }
  });
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Validate data completeness
 */
export function validateDataCompleteness(normalizedData) {
  const issues = [];
  
  // Check all areas have dimensions
  const areas = [...new Set(normalizedData.dimensions.map(d => d.area))];
  
  areas.forEach(area => {
    const areaDims = normalizedData.dimensions.filter(d => d.area === area);
    
    // Check for minimum data
    if (areaDims.length < 2) {
      issues.push(`Area "${area}" has only ${areaDims.length} dimension(s)`);
    }
    
    // Check for wall dimensions (FF-FF, CL-CL)
    const wallDims = areaDims.filter(d => ['FF-FF', 'CL-CL'].includes(d.measurement_type));
    if (wallDims.length === 0) {
      issues.push(`Area "${area}" has no wall-to-wall dimensions`);
    }
  });
  
  return {
    complete: issues.length === 0,
    issues
  };
}

/**
 * Pre-flight validation
 */
export function preFlightValidation(dataset) {
  const dimensionValidation = validateForPDFExport(
    dataset.dimension_set,
    dataset.dimensions
  );
  
  const benchmarkValidation = validateBenchmarkReferences(
    dataset.dimensions,
    dataset.benchmarks
  );
  
  const completenessValidation = validateDataCompleteness({
    dimensions: dataset.dimensions,
    benchmarks: dataset.benchmarks
  });
  
  const allErrors = [
    ...dimensionValidation.errors,
    ...benchmarkValidation.warnings,
    ...completenessValidation.issues
  ];
  
  const allWarnings = [
    ...dimensionValidation.warnings
  ];
  
  return {
    can_generate: dimensionValidation.can_export,
    errors: allErrors,
    warnings: allWarnings,
    validations: {
      dimensions: dimensionValidation,
      benchmarks: benchmarkValidation,
      completeness: completenessValidation
    }
  };
}