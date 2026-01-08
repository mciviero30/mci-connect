/**
 * Dimension Set Validation
 * 
 * Business rules and guards for dimension set workflow
 */

/**
 * Validate dimension set for submission
 */
export async function validateForSubmission(dimensionSet, base44Client) {
  const errors = [];
  const warnings = [];
  const flags = {
    missing_benchmarks: false,
    low_confidence_measurements: false,
    incomplete_measurements: false,
    requires_supervisor_review: false
  };
  
  // Check if has dimensions
  if (!dimensionSet.dimension_ids || dimensionSet.dimension_ids.length === 0) {
    errors.push('Dimension set must contain at least one measurement');
  } else {
    // Fetch dimensions
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids }
    });
    
    // Check for missing benchmarks
    const hasBenchmarkMeasurements = dimensions.some(d => 
      ['BM-C', 'BM-F', 'BM'].includes(d.measurement_type)
    );
    
    if (hasBenchmarkMeasurements) {
      // Check if benchmarks exist
      const benchmarks = await base44Client.entities.Benchmark.filter({
        job_id: dimensionSet.job_id,
        is_active: true
      });
      
      if (benchmarks.length === 0) {
        flags.missing_benchmarks = true;
        flags.requires_supervisor_review = true;
        warnings.push('No active benchmarks found - supervisor review required');
      }
    }
    
    // Check for low confidence measurements
    const lowConfidenceDimensions = dimensions.filter(d => 
      d.confidence_score && d.confidence_score < 0.75
    );
    
    if (lowConfidenceDimensions.length > 0) {
      flags.low_confidence_measurements = true;
      flags.requires_supervisor_review = true;
      warnings.push(`${lowConfidenceDimensions.length} measurement(s) with low confidence - supervisor review required`);
    }
    
    // Check for incomplete measurements
    const incompleteDimensions = dimensions.filter(d => 
      !d.value_feet && !d.value_inches && !d.value_mm
    );
    
    if (incompleteDimensions.length > 0) {
      flags.incomplete_measurements = true;
      errors.push(`${incompleteDimensions.length} measurement(s) missing values`);
    }
    
    // Check for voice-captured measurements requiring review
    const voiceCaptured = dimensions.filter(d => 
      d.created_from === 'voice_note' && d.requires_review
    );
    
    if (voiceCaptured.length > 0) {
      flags.requires_supervisor_review = true;
      warnings.push(`${voiceCaptured.length} voice-captured measurement(s) require review`);
    }
  }
  
  return {
    canSubmit: errors.length === 0,
    errors,
    warnings,
    flags
  };
}

/**
 * Validate dimension set for approval
 */
export async function validateForApproval(dimensionSet, base44Client) {
  const errors = [];
  const warnings = [];
  
  // Check validation flags
  if (dimensionSet.validation_flags) {
    const flags = dimensionSet.validation_flags;
    
    if (flags.missing_benchmarks) {
      warnings.push('Missing benchmarks - verify measurements are correct');
    }
    
    if (flags.low_confidence_measurements) {
      warnings.push('Low confidence measurements detected - verify accuracy');
    }
    
    if (flags.incomplete_measurements) {
      errors.push('Cannot approve set with incomplete measurements');
    }
  }
  
  // Fetch dimensions for additional checks
  if (dimensionSet.dimension_ids && dimensionSet.dimension_ids.length > 0) {
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids }
    });
    
    // Check for draft status
    const draftDimensions = dimensions.filter(d => d.status === 'draft');
    
    if (draftDimensions.length > 0) {
      errors.push(`${draftDimensions.length} measurement(s) still in draft status`);
    }
    
    // Check for measurements without measurement type
    const missingType = dimensions.filter(d => !d.measurement_type);
    
    if (missingType.length > 0) {
      errors.push(`${missingType.length} measurement(s) missing measurement type`);
    }
  }
  
  return {
    canApprove: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate dimension set for production lock
 */
export async function validateForLock(dimensionSet, base44Client) {
  const errors = [];
  
  // Must be approved
  if (dimensionSet.workflow_state !== 'approved') {
    errors.push('Can only lock approved dimension sets');
  }
  
  // Must have approval metadata
  if (!dimensionSet.approved_by || !dimensionSet.approved_at) {
    errors.push('Missing approval metadata');
  }
  
  // Must have dimensions
  if (!dimensionSet.dimension_ids || dimensionSet.dimension_ids.length === 0) {
    errors.push('Cannot lock empty dimension set');
  }
  
  return {
    canLock: errors.length === 0,
    errors
  };
}

/**
 * Check if dimension set requires supervisor review
 */
export function requiresSupervisorReview(dimensionSet) {
  if (!dimensionSet.validation_flags) {
    return false;
  }
  
  return dimensionSet.validation_flags.requires_supervisor_review === true;
}

/**
 * Get validation summary for UI display
 */
export function getValidationSummary(dimensionSet) {
  const flags = dimensionSet.validation_flags || {};
  const issues = [];
  
  if (flags.missing_benchmarks) {
    issues.push({
      type: 'warning',
      message: 'Missing benchmarks',
      severity: 'medium'
    });
  }
  
  if (flags.low_confidence_measurements) {
    issues.push({
      type: 'warning',
      message: 'Low confidence measurements',
      severity: 'medium'
    });
  }
  
  if (flags.incomplete_measurements) {
    issues.push({
      type: 'error',
      message: 'Incomplete measurements',
      severity: 'high'
    });
  }
  
  if (flags.requires_supervisor_review) {
    issues.push({
      type: 'info',
      message: 'Requires supervisor review',
      severity: 'medium'
    });
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    canSubmit: !issues.some(i => i.type === 'error')
  };
}