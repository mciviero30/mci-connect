/**
 * Dimension Comparison Engine for MCI Field
 * 
 * Compares Site Dimensions vs Production Dimensions to detect discrepancies
 */

import { convertToInches } from './DimensionValidationService';

// Default tolerance per measurement type (in inches)
const DEFAULT_TOLERANCES = {
  'FF-FF': 0.125,  // ±1/8"
  'FF-CL': 0.125,
  'CL-FF': 0.125,
  'CL-CL': 0.125,
  'BM-C': 0.0625,  // ±1/16" (tighter for vertical)
  'BM-F': 0.0625,
  'F-C': 0.0625,
  'BM': 0.03125    // ±1/32" (reference point)
};

/**
 * Match site dimension to production dimension
 */
function findProductionMatch(siteDimension, productionDimensions) {
  return productionDimensions.find(prod => 
    prod.job_id === siteDimension.job_id &&
    prod.area === siteDimension.area &&
    prod.measurement_type === siteDimension.measurement_type
  );
}

/**
 * Calculate delta between two dimensions
 */
function calculateDelta(siteDimension, productionDimension) {
  const siteValue = convertToInches(siteDimension);
  const prodValue = convertToInches(productionDimension);
  
  return {
    siteInches: siteValue,
    productionInches: prodValue,
    deltaInches: siteValue - prodValue,
    deltaPercent: ((siteValue - prodValue) / prodValue) * 100
  };
}

/**
 * Determine comparison status
 */
function determineStatus(delta, tolerance) {
  const absDelta = Math.abs(delta);
  
  if (absDelta <= tolerance) {
    return 'ok';
  }
  
  if (absDelta <= tolerance * 2) {
    return 'warning';
  }
  
  return 'error';
}

/**
 * Determine probable error source
 */
function determineProbableSource(siteDimension, productionDimension, delta, tolerance) {
  const absDelta = Math.abs(delta);
  
  // Within tolerance - no error
  if (absDelta <= tolerance) {
    return 'none';
  }
  
  // Check metadata for clues
  const siteVerified = siteDimension.status === 'verified' || siteDimension.status === 'production_ready';
  const prodVerified = productionDimension.status === 'verified' || productionDimension.status === 'production_ready';
  
  // If site is verified but production isn't
  if (siteVerified && !prodVerified) {
    return 'production_error';
  }
  
  // If production is verified but site isn't
  if (!siteVerified && prodVerified) {
    return 'site_error';
  }
  
  // Check measurement device reliability
  const siteDeviceReliability = getDeviceReliability(siteDimension.device_type);
  const prodDeviceReliability = getDeviceReliability(productionDimension.device_type);
  
  if (siteDeviceReliability > prodDeviceReliability) {
    return 'production_error';
  }
  
  if (prodDeviceReliability > siteDeviceReliability) {
    return 'site_error';
  }
  
  // Large delta suggests systematic error
  if (absDelta > tolerance * 5) {
    return 'unknown_systematic';
  }
  
  // Otherwise unknown - requires manual review
  return 'unknown';
}

/**
 * Get device reliability score
 */
function getDeviceReliability(deviceType) {
  const scores = {
    'laser': 5,
    'digital': 4,
    'tape': 2,
    'manual': 1
  };
  
  return scores[deviceType] || 3;
}

/**
 * Format comparison result
 */
function formatComparisonResult(siteDimension, productionDimension, delta, tolerance, status, probableSource) {
  return {
    dimension_id: siteDimension.id,
    production_dimension_id: productionDimension?.id || null,
    job_id: siteDimension.job_id,
    area: siteDimension.area,
    measurement_type: siteDimension.measurement_type,
    
    site_value: {
      feet: siteDimension.value_feet,
      inches: siteDimension.value_inches,
      fraction: siteDimension.value_fraction,
      mm: siteDimension.value_mm,
      unit_system: siteDimension.unit_system,
      total_inches: delta.siteInches,
      display: formatDimensionDisplay(siteDimension)
    },
    
    production_value: productionDimension ? {
      feet: productionDimension.value_feet,
      inches: productionDimension.value_inches,
      fraction: productionDimension.value_fraction,
      mm: productionDimension.value_mm,
      unit_system: productionDimension.unit_system,
      total_inches: delta.productionInches,
      display: formatDimensionDisplay(productionDimension)
    } : null,
    
    delta: {
      inches: delta.deltaInches,
      percent: delta.deltaPercent,
      display: `${delta.deltaInches > 0 ? '+' : ''}${delta.deltaInches.toFixed(3)}"`
    },
    
    tolerance: {
      value: tolerance,
      unit: 'in',
      display: `±${tolerance}"`
    },
    
    status,
    probable_source: probableSource,
    
    metadata: {
      site_verified: siteDimension.status === 'verified' || siteDimension.status === 'production_ready',
      production_verified: productionDimension ? 
        (productionDimension.status === 'verified' || productionDimension.status === 'production_ready') : 
        false,
      site_device: siteDimension.device_type,
      production_device: productionDimension?.device_type,
      compared_at: new Date().toISOString()
    }
  };
}

/**
 * Format dimension for display
 */
function formatDimensionDisplay(dimension) {
  if (dimension.unit_system === 'imperial') {
    const parts = [];
    if (dimension.value_feet > 0) parts.push(`${dimension.value_feet}'`);
    const inchPart = dimension.value_fraction !== '0' 
      ? `${dimension.value_inches} ${dimension.value_fraction}"`
      : `${dimension.value_inches}"`;
    parts.push(inchPart);
    return parts.join(' ');
  }
  
  return `${dimension.value_mm}mm`;
}

/**
 * Compare single site dimension to production
 */
export function compareSingleDimension(siteDimension, productionDimensions, toleranceOverrides = {}) {
  // Find matching production dimension
  const productionMatch = findProductionMatch(siteDimension, productionDimensions);
  
  // If no production match, flag as missing
  if (!productionMatch) {
    return {
      dimension_id: siteDimension.id,
      status: 'no_production_match',
      probable_source: 'production_error',
      site_value: {
        total_inches: convertToInches(siteDimension),
        display: formatDimensionDisplay(siteDimension)
      },
      production_value: null,
      metadata: {
        compared_at: new Date().toISOString()
      }
    };
  }
  
  // Get tolerance
  const tolerance = toleranceOverrides[siteDimension.measurement_type] || 
                   DEFAULT_TOLERANCES[siteDimension.measurement_type] || 
                   0.125;
  
  // Calculate delta
  const delta = calculateDelta(siteDimension, productionMatch);
  
  // Determine status
  const status = determineStatus(delta.deltaInches, tolerance);
  
  // Determine probable source
  const probableSource = determineProbableSource(siteDimension, productionMatch, delta.deltaInches, tolerance);
  
  // Format result
  return formatComparisonResult(siteDimension, productionMatch, delta, tolerance, status, probableSource);
}

/**
 * Compare all site dimensions to production
 */
export function compareAllDimensions(siteDimensions, productionDimensions, options = {}) {
  const results = siteDimensions.map(siteDim => 
    compareSingleDimension(siteDim, productionDimensions, options.toleranceOverrides)
  );
  
  return {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length,
    no_match: results.filter(r => r.status === 'no_production_match').length,
    results,
    summary: generateComparisonSummary(results),
    compared_at: new Date().toISOString(),
    compared_by: options.userId
  };
}

/**
 * Generate comparison summary
 */
function generateComparisonSummary(results) {
  const summary = {
    by_status: {
      ok: results.filter(r => r.status === 'ok'),
      warning: results.filter(r => r.status === 'warning'),
      error: results.filter(r => r.status === 'error'),
      no_match: results.filter(r => r.status === 'no_production_match')
    },
    by_source: {
      site_error: results.filter(r => r.probable_source === 'site_error'),
      production_error: results.filter(r => r.probable_source === 'production_error'),
      unknown: results.filter(r => r.probable_source === 'unknown'),
      unknown_systematic: results.filter(r => r.probable_source === 'unknown_systematic')
    },
    by_measurement_type: {}
  };
  
  // Group by measurement type
  results.forEach(result => {
    const type = result.measurement_type;
    if (!summary.by_measurement_type[type]) {
      summary.by_measurement_type[type] = {
        total: 0,
        ok: 0,
        warning: 0,
        error: 0
      };
    }
    
    summary.by_measurement_type[type].total++;
    if (result.status === 'ok') summary.by_measurement_type[type].ok++;
    if (result.status === 'warning') summary.by_measurement_type[type].warning++;
    if (result.status === 'error') summary.by_measurement_type[type].error++;
  });
  
  return summary;
}

/**
 * Compare dimensions by area
 */
export function compareDimensionsByArea(siteDimensions, productionDimensions, area, options = {}) {
  const siteDimsInArea = siteDimensions.filter(d => d.area === area);
  const prodDimsInArea = productionDimensions.filter(d => d.area === area);
  
  return compareAllDimensions(siteDimsInArea, prodDimsInArea, options);
}

/**
 * Get discrepancy report (only issues)
 */
export function getDiscrepancyReport(comparisonResults) {
  const discrepancies = comparisonResults.results.filter(r => 
    r.status === 'warning' || r.status === 'error' || r.status === 'no_production_match'
  );
  
  return {
    total_discrepancies: discrepancies.length,
    critical: discrepancies.filter(d => d.status === 'error').length,
    warnings: discrepancies.filter(d => d.status === 'warning').length,
    missing: discrepancies.filter(d => d.status === 'no_production_match').length,
    discrepancies,
    generated_at: new Date().toISOString()
  };
}

/**
 * Export comparison results for review
 */
export function exportComparisonData(comparisonResults) {
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    summary: comparisonResults.summary,
    discrepancies: getDiscrepancyReport(comparisonResults),
    full_results: comparisonResults.results
  };
}