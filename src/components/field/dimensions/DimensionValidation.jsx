// Validation rules for Field Dimensions
// CRITICAL: These prevent production errors

export const VALIDATION_RULES = {
  horizontal: {
    min_inches: 6,      // 6 inches minimum
    max_inches: 600,    // 50 feet maximum (50 * 12)
    min_mm: 150,        // ~6 inches
    max_mm: 15240,      // ~50 feet
  },
  vertical: {
    min_inches: 6,      // 6 inches minimum
    max_inches: 360,    // 30 feet maximum (30 * 12)
    min_mm: 150,        // ~6 inches
    max_mm: 9144,       // ~30 feet
  }
};

export function validateDimension(formData) {
  const errors = [];

  // 1. Measurement type is required
  if (!formData.measurement_type) {
    errors.push({ field: 'measurement_type', message: 'Measurement type is required' });
  }

  // 2. Validate horizontal measurements
  if (formData.dimension_type === 'horizontal') {
    if (formData.unit_system === 'imperial') {
      const totalInches = (formData.value_feet || 0) * 12 + (formData.value_inches || 0);
      
      if (totalInches === 0) {
        errors.push({ field: 'value', message: 'Measurement cannot be zero', severity: 'error' });
      }
      
      if (totalInches < 0) {
        errors.push({ field: 'value', message: 'Measurement cannot be negative', severity: 'error' });
      }
      
      if (totalInches < VALIDATION_RULES.horizontal.min_inches) {
        errors.push({ 
          field: 'value', 
          message: `Measurement too small (min: ${VALIDATION_RULES.horizontal.min_inches}")`, 
          severity: 'error' 
        });
      }
      
      if (totalInches > VALIDATION_RULES.horizontal.max_inches) {
        errors.push({ 
          field: 'value', 
          message: `Measurement too large (max: ${Math.floor(VALIDATION_RULES.horizontal.max_inches / 12)}')`, 
          severity: 'warning' 
        });
      }
    } else {
      const mm = formData.value_mm || 0;
      
      if (mm === 0) {
        errors.push({ field: 'value', message: 'Measurement cannot be zero', severity: 'error' });
      }
      
      if (mm < 0) {
        errors.push({ field: 'value', message: 'Measurement cannot be negative', severity: 'error' });
      }
      
      if (mm < VALIDATION_RULES.horizontal.min_mm) {
        errors.push({ 
          field: 'value', 
          message: `Measurement too small (min: ${VALIDATION_RULES.horizontal.min_mm}mm)`, 
          severity: 'error' 
        });
      }
      
      if (mm > VALIDATION_RULES.horizontal.max_mm) {
        errors.push({ 
          field: 'value', 
          message: `Measurement too large (max: ${VALIDATION_RULES.horizontal.max_mm}mm)`, 
          severity: 'warning' 
        });
      }
    }
  }

  // 3. Validate vertical measurements
  if (formData.dimension_type === 'vertical') {
    // Bench Mark validation
    if (formData.measurement_type !== 'BM-ONLY') {
      if (formData.measurement_type === 'F-C') {
        // Floor to ceiling - validate total height
        if (formData.unit_system === 'imperial') {
          const totalInches = (formData.value_feet || 0) * 12 + (formData.value_inches || 0);
          
          if (totalInches === 0) {
            errors.push({ field: 'value', message: 'Height cannot be zero', severity: 'error' });
          }
          
          if (totalInches < VALIDATION_RULES.vertical.min_inches) {
            errors.push({ 
              field: 'value', 
              message: `Height too small (min: ${VALIDATION_RULES.vertical.min_inches}")`, 
              severity: 'error' 
            });
          }
        } else {
          const mm = formData.value_mm || 0;
          if (mm === 0) {
            errors.push({ field: 'value', message: 'Height cannot be zero', severity: 'error' });
          }
        }
      } else {
        // BM-C or BM-F - validate above/below
        const hasAbove = (formData.benchmark_above || 0) > 0;
        const hasBelow = (formData.benchmark_below || 0) > 0;
        
        if (!hasAbove && !hasBelow) {
          errors.push({ 
            field: 'benchmark', 
            message: 'Bench Mark requires at least one measurement (above or below)', 
            severity: 'error' 
          });
        }
        
        // Validate BM measurements are positive
        if (formData.benchmark_above && formData.benchmark_above < 0) {
          errors.push({ field: 'benchmark', message: 'Above BM cannot be negative', severity: 'error' });
        }
        
        if (formData.benchmark_below && formData.benchmark_below < 0) {
          errors.push({ field: 'benchmark', message: 'Below BM cannot be negative', severity: 'error' });
        }
      }
    }
  }

  // 4. Area/location recommendation
  if (!formData.area || formData.area.trim() === '') {
    errors.push({ 
      field: 'area', 
      message: 'Area/location helps identify measurements', 
      severity: 'warning' 
    });
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings: errors.filter(e => e.severity === 'warning'),
    hasWarnings: errors.some(e => e.severity === 'warning')
  };
}

export function validateBenchMarkConfirmation(formData) {
  if (formData.measurement_type === 'BM-ONLY') {
    return {
      required: true,
      message: 'Confirm Bench Mark is physically marked on site'
    };
  }
  return { required: false };
}

export function getValidationColor(severity) {
  return severity === 'error' ? 'red' : 'yellow';
}