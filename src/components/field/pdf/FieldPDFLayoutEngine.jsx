/**
 * Field PDF Layout Engine
 * 
 * Production-grade layout logic for dimension PDFs
 */

/**
 * Group dimensions for production layout
 */
export function groupDimensionsForProduction(dimensions) {
  // Group by area
  const byArea = {};
  
  dimensions.forEach(dim => {
    const area = dim.area || 'Unspecified';
    if (!byArea[area]) {
      byArea[area] = {
        area_name: area,
        wall_dimensions: [],
        vertical_dimensions: [],
        benchmark_dimensions: []
      };
    }
    
    // Categorize by type
    if (['FF-FF', 'FF-CL', 'CL-FF', 'CL-CL'].includes(dim.measurement_type)) {
      byArea[area].wall_dimensions.push(dim);
    } else if (['BM-C', 'BM-F', 'F-C'].includes(dim.measurement_type)) {
      byArea[area].vertical_dimensions.push(dim);
    } else if (dim.measurement_type === 'BM') {
      byArea[area].benchmark_dimensions.push(dim);
    }
  });
  
  // Convert to array and sort by area name
  return Object.values(byArea).sort((a, b) => 
    a.area_name.localeCompare(b.area_name)
  );
}

/**
 * Calculate wall-to-wall sequences
 */
export function calculateWallSequences(wallDimensions) {
  // Group by measurement type
  const sequences = {
    'FF-FF': [],
    'FF-CL': [],
    'CL-FF': [],
    'CL-CL': []
  };
  
  wallDimensions.forEach(dim => {
    const type = dim.measurement_type;
    if (sequences[type]) {
      sequences[type].push(dim);
    }
  });
  
  // Sort each sequence by value
  Object.keys(sequences).forEach(type => {
    sequences[type].sort((a, b) => {
      const totalA = (a.value_feet || 0) * 12 + (a.value_inches || 0);
      const totalB = (b.value_feet || 0) * 12 + (b.value_inches || 0);
      return totalA - totalB;
    });
  });
  
  return sequences;
}

/**
 * Format dimension row for table
 */
export function formatDimensionRow(dimension, index) {
  return {
    index: index + 1,
    type: dimension.measurement_type,
    imperial: dimension.display_value_imperial,
    metric: dimension.display_value_metric,
    tolerance: formatTolerance(dimension),
    benchmark: dimension.benchmark_label || '-',
    notes: truncateNotes(dimension.notes, 50)
  };
}

/**
 * Format tolerance
 */
function formatTolerance(dimension) {
  if (!dimension.tolerance_plus && !dimension.tolerance_minus) {
    return '±0';
  }
  
  const plus = dimension.tolerance_plus || 0;
  const minus = dimension.tolerance_minus || 0;
  
  if (plus === minus) {
    return `±${plus}"`;
  }
  
  return `+${plus}"/-${minus}"`;
}

/**
 * Truncate notes
 */
function truncateNotes(notes, maxLength) {
  if (!notes || notes.length <= maxLength) return notes || '';
  return notes.substring(0, maxLength - 3) + '...';
}

/**
 * Create production legend
 */
export function createProductionLegend() {
  return [
    { code: 'FF-FF', description: 'Finish Face to Finish Face', color: '#3B82F6' },
    { code: 'FF-CL', description: 'Finish Face to Center Line', color: '#10B981' },
    { code: 'CL-FF', description: 'Center Line to Finish Face', color: '#F59E0B' },
    { code: 'CL-CL', description: 'Center Line to Center Line', color: '#8B5CF6' },
    { code: 'BM-C', description: 'Benchmark to Ceiling', color: '#EF4444' },
    { code: 'BM-F', description: 'Benchmark to Floor', color: '#EC4899' },
    { code: 'F-C', description: 'Floor to Ceiling', color: '#06B6D4' },
    { code: 'BM', description: 'Benchmark Reference', color: '#6B7280' }
  ];
}

/**
 * Calculate summary statistics
 */
export function calculateDimensionStats(dimensions) {
  const byType = {};
  
  dimensions.forEach(dim => {
    const type = dim.measurement_type;
    if (!byType[type]) {
      byType[type] = { count: 0, total_inches: 0 };
    }
    
    byType[type].count++;
    byType[type].total_inches += (dim.value_feet || 0) * 12 + (dim.value_inches || 0);
  });
  
  return {
    total_dimensions: dimensions.length,
    by_type: byType,
    areas: [...new Set(dimensions.map(d => d.area))].length,
    unit_systems: [...new Set(dimensions.map(d => d.unit_system))]
  };
}