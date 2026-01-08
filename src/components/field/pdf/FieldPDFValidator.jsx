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
  const errors = [];
  const warnings = [];
  
  // Create benchmark lookup
  const benchmarkMap = {};
  benchmarks.forEach(bm => {
    benchmarkMap[bm.id || bm.local_id] = bm;
    if (bm.label) benchmarkMap[bm.label] = bm;
  });
  
  // Check each dimension's benchmark requirement
  dimensions.forEach(dim => {
    const requiresBenchmark = ['BM-C', 'BM-F', 'F-C'].includes(dim.measurement_type);
    
    if (requiresBenchmark) {
      // MUST have benchmark reference
      if (!dim.benchmark_id && !dim.benchmark_label) {
        errors.push(`${dim.measurement_type} dimension missing benchmark reference (area: ${dim.area})`);
      } else {
        // Verify benchmark exists
        const benchmarkExists = benchmarkMap[dim.benchmark_id] || benchmarkMap[dim.benchmark_label];
        if (!benchmarkExists) {
          errors.push(`Dimension references non-existent benchmark: ${dim.benchmark_label || dim.benchmark_id}`);
        }
      }
    }
  });
  
  // Check for unused benchmarks
  benchmarks.forEach(bm => {
    const isReferenced = dimensions.some(d => 
      d.benchmark_id === bm.id || 
      d.benchmark_id === bm.local_id ||
      d.benchmark_label === bm.label
    );
    
    if (!isReferenced && bm.type !== 'reference_only') {
      warnings.push(`Benchmark ${bm.label} is not referenced by any dimensions`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
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
 * Validate photo attachments
 */
export function validatePhotoAttachments(photos, dimensions, benchmarks) {
  const warnings = [];
  
  // Validate dimension photos
  photos.dimension_photos.forEach(photo => {
    const dimension = dimensions.find(d => 
      d.id === photo.dimension_id || d.local_id === photo.dimension_id
    );
    
    if (!dimension) {
      warnings.push(`Photo references non-existent dimension: ${photo.dimension_id}`);
    }
  });
  
  // Validate benchmark photos
  photos.benchmark_photos.forEach(photo => {
    const benchmark = benchmarks.find(b => 
      b.id === photo.benchmark_id || b.local_id === photo.benchmark_id
    );
    
    if (!benchmark) {
      warnings.push(`Photo references non-existent benchmark: ${photo.benchmark_id}`);
    }
  });
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Validate plan overlays
 */
export function validatePlanOverlays(plans, dimensions) {
  const warnings = [];
  
  plans.forEach(plan => {
    plan.dimension_overlays.forEach(overlay => {
      const dimension = dimensions.find(d => 
        d.id === overlay.dimension_id || d.local_id === overlay.dimension_id
      );
      
      if (!dimension) {
        warnings.push(`Plan "${plan.name}" references non-existent dimension: ${overlay.dimension_id}`);
      }
    });
  });
  
  return {
    valid: warnings.length === 0,
    warnings
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
  
  const photoValidation = validatePhotoAttachments(
    dataset.photos,
    dataset.dimensions,
    dataset.benchmarks
  );
  
  const planValidation = validatePlanOverlays(
    dataset.plans,
    dataset.dimensions
  );
  
  const allErrors = [
    ...dimensionValidation.errors,
    ...benchmarkValidation.errors,
    ...completenessValidation.issues
  ];
  
  const allWarnings = [
    ...dimensionValidation.warnings,
    ...benchmarkValidation.warnings,
    ...photoValidation.warnings,
    ...planValidation.warnings
  ];
  
  return {
    can_generate: dimensionValidation.can_export,
    errors: allErrors,
    warnings: allWarnings,
    validations: {
      dimensions: dimensionValidation,
      benchmarks: benchmarkValidation,
      completeness: completenessValidation,
      photos: photoValidation,
      plans: planValidation
    }
  };
}