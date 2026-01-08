/**
 * Field PDF Benchmark Validator
 * 
 * Specialized validation for benchmark data in PDFs
 */

/**
 * Validate benchmark completeness
 */
export function validateBenchmarkCompleteness(benchmarks, dimensions) {
  const errors = [];
  const warnings = [];
  
  // Check for BM-C without BM-F pairs
  const verticalDims = dimensions.filter(d => ['BM-C', 'BM-F', 'F-C'].includes(d.measurement_type));
  
  const benchmarkUsage = {};
  
  verticalDims.forEach(dim => {
    const label = dim.benchmark_label;
    if (!label) return;
    
    if (!benchmarkUsage[label]) {
      benchmarkUsage[label] = { hasC: false, hasF: false, hasFC: false };
    }
    
    if (dim.measurement_type === 'BM-C') benchmarkUsage[label].hasC = true;
    if (dim.measurement_type === 'BM-F') benchmarkUsage[label].hasF = true;
    if (dim.measurement_type === 'F-C') benchmarkUsage[label].hasFC = true;
  });
  
  // Validate pairs
  Object.entries(benchmarkUsage).forEach(([label, usage]) => {
    if (usage.hasC && !usage.hasF && !usage.hasFC) {
      warnings.push(`Benchmark ${label}: Has BM-C but missing BM-F or F-C`);
    }
    if (usage.hasF && !usage.hasC && !usage.hasFC) {
      warnings.push(`Benchmark ${label}: Has BM-F but missing BM-C or F-C`);
    }
  });
  
  // Check for benchmarks without measurements
  benchmarks.forEach(bm => {
    if (!benchmarkUsage[bm.label]) {
      warnings.push(`Benchmark ${bm.label}: Defined but never used in measurements`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate benchmark elevation consistency
 */
export function validateBenchmarkElevations(benchmarks) {
  const warnings = [];
  
  benchmarks.forEach(bm => {
    // Floor benchmarks should be low
    if (bm.type === 'floor_mark' && bm.elevation > 12) {
      warnings.push(`${bm.label}: Floor benchmark elevation ${bm.elevation}" seems high`);
    }
    
    // Laser lines typically 36-48 inches
    if (bm.type === 'laser' && (bm.elevation < 24 || bm.elevation > 60)) {
      warnings.push(`${bm.label}: Laser line elevation ${bm.elevation}" is unusual`);
    }
  });
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Get benchmark traceability data
 */
export function getBenchmarkTraceability(benchmark, dimensions) {
  // Find all dimensions using this benchmark
  const referencingDimensions = dimensions.filter(d => 
    d.benchmark_id === benchmark.id || 
    d.benchmark_label === benchmark.label
  );
  
  return {
    benchmark_id: benchmark.id || benchmark.local_id,
    benchmark_label: benchmark.label,
    color_code: benchmark.color_code,
    established_by: benchmark.established_by,
    established_date: benchmark.established_date,
    reference_count: referencingDimensions.length,
    referenced_by: referencingDimensions.map(d => ({
      dimension_id: d.id || d.local_id,
      measurement_type: d.measurement_type,
      area: d.area,
      value: d.display_value_imperial
    })),
    is_active: benchmark.is_active,
    type: benchmark.type
  };
}

/**
 * Generate benchmark usage report
 */
export function generateBenchmarkUsageReport(benchmarks, dimensions) {
  return benchmarks.map(bm => getBenchmarkTraceability(bm, dimensions));
}