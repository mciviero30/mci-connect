/**
 * Site Notes Validation Service
 * 
 * Validates extracted entities before user confirmation
 */

/**
 * Validate dimension data
 */
export function validateDimension(dimensionData) {
  const errors = [];
  const warnings = [];
  
  // Required: measurement type
  if (!dimensionData.measurement_type) {
    errors.push('Measurement type is required (FF-FF, BM-C, etc.)');
  }
  
  // Required: value
  const hasImperialValue = dimensionData.value_feet !== undefined || dimensionData.value_inches !== undefined;
  const hasMetricValue = dimensionData.value_mm !== undefined;
  
  if (!hasImperialValue && !hasMetricValue) {
    errors.push('Measurement value is required');
  }
  
  // Validate measurement type matches dimension type
  if (dimensionData.measurement_type && dimensionData.dimension_type) {
    const verticalTypes = ['BM-C', 'BM-F', 'F-C'];
    const isVerticalType = verticalTypes.includes(dimensionData.measurement_type);
    const isVerticalDimension = dimensionData.dimension_type === 'vertical';
    
    if (isVerticalType && !isVerticalDimension) {
      warnings.push('Vertical measurement type detected but dimension type is not vertical');
    }
  }
  
  // Validate value ranges
  if (dimensionData.value_feet && (dimensionData.value_feet < 0 || dimensionData.value_feet > 100)) {
    warnings.push('Unusual feet value - verify accuracy');
  }
  
  if (dimensionData.value_inches && (dimensionData.value_inches < 0 || dimensionData.value_inches >= 12)) {
    warnings.push('Inches value should be 0-11');
  }
  
  // Recommend area if missing
  if (!dimensionData.area) {
    warnings.push('Location/area not specified - add manually');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

/**
 * Validate benchmark data
 */
export function validateBenchmark(benchmarkData) {
  const errors = [];
  const warnings = [];
  
  if (!benchmarkData.label) {
    errors.push('Benchmark label is required');
  }
  
  if (!benchmarkData.type) {
    errors.push('Benchmark type is required');
  }
  
  if (benchmarkData.elevation === undefined) {
    warnings.push('Elevation value not specified');
  }
  
  if (!benchmarkData.area) {
    warnings.push('Benchmark location not specified');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

/**
 * Validate task data
 */
export function validateTask(taskData) {
  const errors = [];
  const warnings = [];
  
  if (!taskData.title) {
    errors.push('Task title is required');
  }
  
  if (!taskData.priority) {
    warnings.push('Priority not specified - defaulting to medium');
  }
  
  if (!taskData.category) {
    warnings.push('Category not specified');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

/**
 * Validate incident data
 */
export function validateIncident(incidentData) {
  const errors = [];
  const warnings = [];
  
  if (!incidentData.incident_type) {
    errors.push('Incident type is required');
  }
  
  if (!incidentData.severity) {
    errors.push('Severity is required');
  }
  
  if (!incidentData.description) {
    errors.push('Incident description is required');
  }
  
  if (['severe', 'critical'].includes(incidentData.severity) && !incidentData.immediate_action_taken) {
    warnings.push('Severe incidents should document immediate action taken');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

/**
 * Validate extracted entity
 */
export function validateExtractedEntity(draft) {
  const entityType = draft.entity_type;
  const entityData = draft.entity_data;
  
  switch (entityType) {
    case 'dimension':
      return validateDimension(entityData);
    
    case 'benchmark':
      return validateBenchmark(entityData);
    
    case 'task':
      return validateTask(entityData);
    
    case 'incident':
      return validateIncident(entityData);
    
    case 'general_note':
      return { valid: true, errors: [], warnings: [], severity: 'ok' };
    
    default:
      return {
        valid: false,
        errors: [`Unknown entity type: ${entityType}`],
        warnings: [],
        severity: 'error'
      };
  }
}

/**
 * Validate batch of drafts
 */
export function validateDraftBatch(drafts) {
  const results = {
    all_valid: true,
    validations: []
  };
  
  for (const draft of drafts) {
    const validation = validateExtractedEntity(draft);
    
    results.validations.push({
      draft_id: draft.draft_id,
      entity_type: draft.entity_type,
      ...validation
    });
    
    if (!validation.valid) {
      results.all_valid = false;
    }
  }
  
  return results;
}

/**
 * Check for duplicate entities
 */
export async function checkDuplicates(draft, base44Client) {
  try {
    const entityType = draft.entity_type;
    const entityData = draft.entity_data;
    
    if (entityType === 'dimension') {
      // Check for similar dimensions in same area
      const existing = await base44Client.entities.FieldDimension.filter({
        job_id: entityData.job_id,
        area: entityData.area,
        measurement_type: entityData.measurement_type
      }, '-created_date', 10);
      
      // Check if values are very close (within 1 inch)
      const duplicates = existing.filter(e => {
        const totalInches1 = (entityData.value_feet || 0) * 12 + (entityData.value_inches || 0);
        const totalInches2 = (e.value_feet || 0) * 12 + (e.value_inches || 0);
        return Math.abs(totalInches1 - totalInches2) <= 1;
      });
      
      if (duplicates.length > 0) {
        return {
          has_duplicates: true,
          duplicates: duplicates.map(d => ({
            id: d.id,
            value: `${d.value_feet}' ${d.value_inches}" ${d.value_fraction}`,
            created_date: d.created_date
          })),
          message: 'Similar measurement already exists'
        };
      }
    }
    
    if (entityType === 'benchmark') {
      // Check for benchmark with same label
      const existing = await base44Client.entities.Benchmark.filter({
        job_id: entityData.job_id,
        label: entityData.label,
        is_active: true
      });
      
      if (existing.length > 0) {
        return {
          has_duplicates: true,
          duplicates: existing.map(b => ({
            id: b.id,
            label: b.label,
            created_date: b.created_date
          })),
          message: 'Benchmark with same label already exists'
        };
      }
    }
    
    return {
      has_duplicates: false,
      duplicates: []
    };
  } catch (error) {
    console.error('Failed to check duplicates:', error);
    return { has_duplicates: false, duplicates: [] };
  }
}

/**
 * Validate and enrich draft before confirmation
 */
export async function prepareForConfirmation(draft, base44Client) {
  try {
    // Validate
    const validation = validateExtractedEntity(draft);
    
    // Check duplicates
    const duplicateCheck = await checkDuplicates(draft, base44Client);
    
    // Prepare confirmation data
    return {
      draft_id: draft.draft_id,
      entity_type: draft.entity_type,
      entity_data: draft.entity_data,
      validation,
      duplicate_check: duplicateCheck,
      confidence_score: draft.confidence_score,
      requires_review: draft.requires_review,
      can_confirm: validation.valid && !duplicateCheck.has_duplicates,
      warnings: [
        ...validation.warnings,
        ...(duplicateCheck.has_duplicates ? [duplicateCheck.message] : [])
      ]
    };
  } catch (error) {
    console.error('Failed to prepare for confirmation:', error);
    throw error;
  }
}