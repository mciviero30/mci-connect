/**
 * Field PDF Legend Generator
 * 
 * Auto-generates legends based on actual data used in PDF
 */

/**
 * Generate legend data from actual usage
 */
export function generateLegendFromData(dimensions, benchmarks) {
  // Extract used measurement types
  const usedTypes = [...new Set(dimensions.map(d => d.measurement_type))];
  
  // Extract used benchmarks
  const usedBenchmarks = benchmarks.filter(b => b.is_active !== false);
  
  return {
    measurement_types: getMeasurementTypeLegend(usedTypes),
    benchmarks: getBenchmarkLegend(usedBenchmarks),
    unit_systems: getUnitSystemLegend(dimensions),
    symbols: getSymbolLegend()
  };
}

/**
 * Get measurement type legend entries
 */
function getMeasurementTypeLegend(usedTypes) {
  const allTypes = {
    'FF-FF': {
      name: 'Finish Face to Finish Face',
      description: 'Measurement between two finished surfaces',
      use_case: 'Wall-to-wall dimensions',
      color: '#3B82F6',
      icon: '⟷'
    },
    'FF-CL': {
      name: 'Finish Face to Center Line',
      description: 'Measurement from finished surface to center line',
      use_case: 'Wall to opening center',
      color: '#10B981',
      icon: '⟼'
    },
    'CL-FF': {
      name: 'Center Line to Finish Face',
      description: 'Measurement from center line to finished surface',
      use_case: 'Opening center to wall',
      color: '#F59E0B',
      icon: '⟻'
    },
    'CL-CL': {
      name: 'Center Line to Center Line',
      description: 'Measurement between two center lines',
      use_case: 'Opening-to-opening spacing',
      color: '#8B5CF6',
      icon: '↔'
    },
    'BM-C': {
      name: 'Benchmark to Ceiling',
      description: 'Vertical measurement from benchmark to ceiling',
      use_case: 'Ceiling height verification',
      color: '#EF4444',
      icon: '↑'
    },
    'BM-F': {
      name: 'Benchmark to Floor',
      description: 'Vertical measurement from benchmark to floor',
      use_case: 'Floor elevation verification',
      color: '#EC4899',
      icon: '↓'
    },
    'F-C': {
      name: 'Floor to Ceiling',
      description: 'Direct vertical measurement',
      use_case: 'Total height measurement',
      color: '#06B6D4',
      icon: '↕'
    },
    'BM': {
      name: 'Benchmark Reference',
      description: 'Reference point only (no measurement)',
      use_case: 'Elevation reference',
      color: '#6B7280',
      icon: '●'
    }
  };
  
  // Return only used types
  return usedTypes
    .filter(type => allTypes[type])
    .map(type => ({ code: type, ...allTypes[type] }));
}

/**
 * Get benchmark legend entries
 */
function getBenchmarkLegend(benchmarks) {
  return benchmarks.map(bm => ({
    label: bm.label,
    color_code: bm.color_code,
    elevation: `${bm.elevation} ${bm.elevation_unit}`,
    type: formatBenchmarkType(bm.type),
    area: bm.area
  }));
}

/**
 * Get unit system legend
 */
function getUnitSystemLegend(dimensions) {
  const hasImperial = dimensions.some(d => d.unit_system === 'imperial');
  const hasMetric = dimensions.some(d => d.unit_system === 'metric');
  
  const systems = [];
  
  if (hasImperial) {
    systems.push({
      system: 'Imperial',
      format: 'Feet-Inches-Fraction',
      example: '5\' 3 1/2"',
      note: 'Primary measurement system'
    });
  }
  
  if (hasMetric) {
    systems.push({
      system: 'Metric',
      format: 'Millimeters',
      example: '1600 mm',
      note: 'Converted from imperial'
    });
  }
  
  return systems;
}

/**
 * Get symbol legend
 */
function getSymbolLegend() {
  return [
    { symbol: '●', meaning: 'Benchmark color indicator', usage: 'Matches benchmark label' },
    { symbol: '✓', meaning: 'Approved dimension', usage: 'Passed quality control' },
    { symbol: '±', meaning: 'Tolerance', usage: 'Acceptable variance' },
    { symbol: '⚠', meaning: 'Requires review', usage: 'Verify before production' }
  ];
}

/**
 * Format benchmark type
 */
function formatBenchmarkType(type) {
  const typeMap = {
    'laser': 'Laser Line',
    'floor_mark': 'Floor Mark',
    'physical_mark': 'Physical Mark',
    'transit': 'Transit Point'
  };
  
  return typeMap[type] || type;
}

/**
 * Generate production notes
 */
export function generateProductionNotes() {
  return [
    {
      title: 'READING THIS DOCUMENT',
      points: [
        'All dimensions are verified and approved for production',
        'Measurements use imperial system (feet-inches) as primary',
        'Metric equivalents provided for reference',
        'Colors in legend correspond to dimension types'
      ]
    },
    {
      title: 'BENCHMARK USAGE',
      points: [
        'Vertical measurements reference benchmark elevations',
        'Verify benchmark locations before production',
        'Benchmark colors match throughout document',
        'Contact field team if benchmarks unclear'
      ]
    },
    {
      title: 'TOLERANCES',
      points: [
        'Standard tolerance: ±1/16" unless specified',
        'Critical dimensions marked with tighter tolerances',
        'Verify tolerances before cutting',
        'Report discrepancies immediately'
      ]
    },
    {
      title: 'QUALITY CONTROL',
      points: [
        'All dimensions approved by supervisor',
        'Cross-reference with drawings when available',
        'Photos provided for context',
        'Document any issues before proceeding'
      ]
    }
  ];
}