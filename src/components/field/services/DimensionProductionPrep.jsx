/**
 * Production/Output Preparation for Field Dimensions
 * 
 * Prepares dimension data for shop/installer use with:
 * - Logical grouping and ordering
 * - Unit normalization
 * - Production metadata
 */

import { convertToInches } from './DimensionValidationService';

/**
 * Measurement type display order for production
 */
const PRODUCTION_ORDER = [
  'FF-FF',  // Finish Face to Finish Face (largest)
  'FF-CL',  // Finish Face to Center Line
  'CL-FF',  // Center Line to Finish Face
  'CL-CL',  // Center Line to Center Line (smallest)
  'BM-C',   // Benchmark to Ceiling
  'BM-F',   // Benchmark to Floor
  'F-C',    // Floor to Ceiling
  'BM'      // Benchmark only
];

/**
 * Color scheme for measurement types (for drawing overlays)
 */
export const MEASUREMENT_COLORS = {
  'FF-FF': '#FF4500',  // Orange Red - Largest dimension
  'FF-CL': '#FF8C00',  // Dark Orange
  'CL-FF': '#FFB800',  // Amber
  'CL-CL': '#32CD32',  // Lime Green - Smallest dimension
  'BM-C': '#4169E1',   // Royal Blue
  'BM-F': '#1E90FF',   // Dodger Blue
  'F-C': '#00CED1',    // Dark Turquoise
  'BM': '#9370DB'      // Medium Purple
};

/**
 * Legend labels for measurement types
 */
export const MEASUREMENT_LABELS = {
  'FF-FF': 'Finish Face to Finish Face',
  'FF-CL': 'Finish Face to Center Line',
  'CL-FF': 'Center Line to Finish Face',
  'CL-CL': 'Center Line to Center Line',
  'BM-C': 'Benchmark to Ceiling',
  'BM-F': 'Benchmark to Floor',
  'F-C': 'Floor to Ceiling',
  'BM': 'Benchmark Reference'
};

/**
 * Group dimensions by project and area
 */
export function groupDimensionsForProduction(dimensions) {
  const grouped = {
    byProject: {},
    byArea: {},
    byType: {}
  };
  
  // Group by project (job_id)
  dimensions.forEach(dim => {
    const projectId = dim.job_id;
    if (!grouped.byProject[projectId]) {
      grouped.byProject[projectId] = {
        job_id: projectId,
        job_name: dim.job_name,
        dimensions: [],
        areas: new Set()
      };
    }
    grouped.byProject[projectId].dimensions.push(dim);
    grouped.byProject[projectId].areas.add(dim.area);
  });
  
  // Convert areas Set to Array
  Object.keys(grouped.byProject).forEach(projectId => {
    grouped.byProject[projectId].areas = Array.from(grouped.byProject[projectId].areas);
  });
  
  // Group by area within each project
  dimensions.forEach(dim => {
    const areaKey = `${dim.job_id}_${dim.area}`;
    if (!grouped.byArea[areaKey]) {
      grouped.byArea[areaKey] = {
        job_id: dim.job_id,
        job_name: dim.job_name,
        area: dim.area,
        dimensions: []
      };
    }
    grouped.byArea[areaKey].dimensions.push(dim);
  });
  
  // Group by measurement type
  dimensions.forEach(dim => {
    const type = dim.measurement_type;
    if (!grouped.byType[type]) {
      grouped.byType[type] = [];
    }
    grouped.byType[type].push(dim);
  });
  
  return grouped;
}

/**
 * Order dimensions logically for production
 */
export function orderDimensionsForProduction(dimensions) {
  return [...dimensions].sort((a, b) => {
    // First: Sort by area
    if (a.area !== b.area) {
      return a.area.localeCompare(b.area);
    }
    
    // Second: Sort by measurement type (production order)
    const orderA = PRODUCTION_ORDER.indexOf(a.measurement_type);
    const orderB = PRODUCTION_ORDER.indexOf(b.measurement_type);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Third: Sort by value (descending - largest first)
    const valueA = convertToInches(a);
    const valueB = convertToInches(b);
    
    return valueB - valueA;
  });
}

/**
 * Normalize dimension units for production output
 */
export function normalizeDimensionUnits(dimension, targetUnit = 'imperial') {
  if (dimension.unit_system === targetUnit) {
    return dimension;
  }
  
  if (targetUnit === 'imperial' && dimension.unit_system === 'metric') {
    // Convert mm to inches, feet, fraction
    const totalInches = dimension.value_mm / 25.4;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches - (feet * 12);
    const inches = Math.floor(remainingInches);
    const decimal = remainingInches - inches;
    
    // Convert decimal to nearest 1/16"
    const fraction = decimalToFraction(decimal);
    
    return {
      ...dimension,
      unit_system: 'imperial',
      value_feet: feet,
      value_inches: inches,
      value_fraction: fraction,
      value_mm: dimension.value_mm, // Keep original
      converted: true
    };
  }
  
  if (targetUnit === 'metric' && dimension.unit_system === 'imperial') {
    // Convert feet/inches to mm
    const totalInches = convertToInches(dimension);
    const mm = totalInches * 25.4;
    
    return {
      ...dimension,
      unit_system: 'metric',
      value_mm: Math.round(mm * 10) / 10, // Round to 1 decimal
      value_feet: dimension.value_feet, // Keep original
      value_inches: dimension.value_inches,
      value_fraction: dimension.value_fraction,
      converted: true
    };
  }
  
  return dimension;
}

/**
 * Convert decimal inches to fraction string
 */
function decimalToFraction(decimal) {
  const sixteenths = Math.round(decimal * 16);
  
  if (sixteenths === 0) return '0';
  if (sixteenths === 16) return '0'; // Round up to next inch
  
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
 * Format dimension for production display
 */
export function formatDimensionForProduction(dimension) {
  const formatted = {
    id: dimension.id,
    area: dimension.area,
    type: dimension.measurement_type,
    typeLabel: MEASUREMENT_LABELS[dimension.measurement_type] || dimension.measurement_type,
    color: MEASUREMENT_COLORS[dimension.measurement_type] || '#888888',
    displayValue: '',
    tolerance: dimension.tolerance,
    material: dimension.material_type,
    notes: dimension.production_notes,
    sequence: dimension.install_sequence,
    verified: dimension.status === 'verified' || dimension.status === 'production_ready'
  };
  
  // Format display value
  if (dimension.unit_system === 'imperial') {
    const parts = [];
    if (dimension.value_feet > 0) parts.push(`${dimension.value_feet}'`);
    if (dimension.value_inches > 0 || dimension.value_fraction !== '0') {
      parts.push(`${dimension.value_inches}${dimension.value_fraction !== '0' ? ' ' + dimension.value_fraction : ''}"`);
    }
    formatted.displayValue = parts.join(' ') || '0"';
  } else {
    formatted.displayValue = `${dimension.value_mm}mm`;
  }
  
  // Add tolerance display
  if (dimension.tolerance) {
    formatted.toleranceDisplay = `±${dimension.tolerance.plus}${dimension.tolerance.unit}`;
  }
  
  return formatted;
}

/**
 * Prepare production package for an area
 */
export function prepareAreaProductionPackage(dimensions, area, options = {}) {
  const areaDimensions = dimensions.filter(d => d.area === area);
  
  // Normalize units if requested
  const targetUnit = options.units || 'imperial';
  const normalized = areaDimensions.map(d => normalizeDimensionUnits(d, targetUnit));
  
  // Order for production
  const ordered = orderDimensionsForProduction(normalized);
  
  // Format for display
  const formatted = ordered.map(d => formatDimensionForProduction(d));
  
  // Build production package
  return {
    area,
    job_id: areaDimensions[0]?.job_id,
    job_name: areaDimensions[0]?.job_name,
    units: targetUnit,
    totalDimensions: formatted.length,
    dimensions: formatted,
    legend: buildLegend(formatted),
    metadata: {
      prepared_at: new Date().toISOString(),
      prepared_by: options.userId,
      include_photos: options.includePhotos || false,
      include_drawings: options.includeDrawings || false
    }
  };
}

/**
 * Build legend for measurement types present
 */
function buildLegend(formattedDimensions) {
  const typesPresent = new Set(formattedDimensions.map(d => d.type));
  
  return Array.from(typesPresent).map(type => ({
    type,
    label: MEASUREMENT_LABELS[type] || type,
    color: MEASUREMENT_COLORS[type] || '#888888',
    count: formattedDimensions.filter(d => d.type === type).length
  })).sort((a, b) => PRODUCTION_ORDER.indexOf(a.type) - PRODUCTION_ORDER.indexOf(b.type));
}

/**
 * Prepare complete production package for a project
 */
export function prepareProjectProductionPackage(dimensions, projectId, options = {}) {
  const projectDimensions = dimensions.filter(d => d.job_id === projectId);
  
  if (projectDimensions.length === 0) {
    return null;
  }
  
  // Get unique areas
  const areas = [...new Set(projectDimensions.map(d => d.area))].sort();
  
  // Prepare package for each area
  const areaPackages = areas.map(area => 
    prepareAreaProductionPackage(projectDimensions, area, options)
  );
  
  return {
    job_id: projectId,
    job_name: projectDimensions[0]?.job_name,
    units: options.units || 'imperial',
    totalAreas: areas.length,
    totalDimensions: projectDimensions.length,
    areas: areaPackages,
    globalLegend: buildLegend(
      areaPackages.flatMap(pkg => pkg.dimensions)
    ),
    metadata: {
      prepared_at: new Date().toISOString(),
      prepared_by: options.userId,
      include_photos: options.includePhotos || false,
      include_drawings: options.includeDrawings || false
    }
  };
}