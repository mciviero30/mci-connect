/**
 * Measurement Intelligence Service
 * 
 * Analyzes field measurements for internal consistency
 * ADVISORY ONLY - does not modify data or suggest corrections
 */

/**
 * Analyze dimensions for a job
 */
export function analyzeMeasurements(dimensions, benchmarks) {
  const byArea = groupByArea(dimensions);
  const areaAnalysis = {};

  Object.entries(byArea).forEach(([area, areaDims]) => {
    areaAnalysis[area] = analyzeArea(areaDims, benchmarks);
  });

  return {
    areas: areaAnalysis,
    overall_status: calculateOverallStatus(areaAnalysis)
  };
}

/**
 * Analyze single area
 */
function analyzeArea(dimensions, benchmarks) {
  const issues = [];
  
  // Check 1: Physically impossible values
  const impossibleValues = detectImpossibleValues(dimensions);
  issues.push(...impossibleValues);
  
  // Check 2: Mathematical inconsistencies
  const mathIssues = detectMathematicalInconsistencies(dimensions);
  issues.push(...mathIssues);
  
  // Check 3: Benchmark consistency
  const benchmarkIssues = detectBenchmarkInconsistencies(dimensions, benchmarks);
  issues.push(...benchmarkIssues);
  
  // Check 4: Measurement type logic
  const typeIssues = detectMeasurementTypeIssues(dimensions);
  issues.push(...typeIssues);
  
  // Categorize by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  let status = 'ok';
  if (critical.length > 0) status = 'inconsistent';
  else if (warnings.length > 0) status = 'needs_review';
  
  return {
    status,
    dimension_count: dimensions.length,
    issues: {
      critical,
      warnings,
      total: issues.length
    }
  };
}

/**
 * Detect physically impossible values
 */
function detectImpossibleValues(dimensions) {
  const issues = [];
  
  dimensions.forEach(dim => {
    const totalInches = (dim.value_feet || 0) * 12 + (dim.value_inches || 0);
    const totalMm = dim.value_mm || 0;
    
    // Negative values
    if (totalInches < 0 || totalMm < 0) {
      issues.push({
        severity: 'critical',
        type: 'impossible_value',
        dimension_id: dim.id,
        dimension_type: dim.measurement_type,
        message: 'Negative measurement detected'
      });
    }
    
    // Unreasonably large (> 100 feet or 30 meters)
    if (totalInches > 1200 || totalMm > 30000) {
      issues.push({
        severity: 'warning',
        type: 'extreme_value',
        dimension_id: dim.id,
        dimension_type: dim.measurement_type,
        message: `Unusually large measurement: ${formatImperial(dim)}`
      });
    }
    
    // Unreasonably small for construction (< 1 inch)
    if (totalInches > 0 && totalInches < 1) {
      issues.push({
        severity: 'warning',
        type: 'extreme_value',
        dimension_id: dim.id,
        dimension_type: dim.measurement_type,
        message: `Unusually small measurement: ${formatImperial(dim)}`
      });
    }
  });
  
  return issues;
}

/**
 * Detect mathematical inconsistencies
 */
function detectMathematicalInconsistencies(dimensions) {
  const issues = [];
  
  // Imperial vs Metric conversion check
  dimensions.forEach(dim => {
    if (dim.value_feet || dim.value_inches) {
      const totalInches = (dim.value_feet || 0) * 12 + (dim.value_inches || 0);
      const fractionInches = parseFraction(dim.value_fraction || '0');
      const totalImperialMm = (totalInches + fractionInches) * 25.4;
      
      const recordedMm = dim.value_mm || 0;
      
      // Allow 2mm tolerance for rounding
      if (Math.abs(totalImperialMm - recordedMm) > 2) {
        issues.push({
          severity: 'warning',
          type: 'conversion_mismatch',
          dimension_id: dim.id,
          dimension_type: dim.measurement_type,
          message: `Imperial/Metric mismatch: ${formatImperial(dim)} ≠ ${recordedMm}mm`
        });
      }
    }
  });
  
  return issues;
}

/**
 * Detect benchmark inconsistencies
 */
function detectBenchmarkInconsistencies(dimensions, benchmarks) {
  const issues = [];
  
  const benchmarkMap = new Map(benchmarks.map(b => [b.id, b]));
  
  // Group dimensions by benchmark
  const byBenchmark = {};
  dimensions.forEach(dim => {
    if (dim.benchmark_id) {
      if (!byBenchmark[dim.benchmark_id]) {
        byBenchmark[dim.benchmark_id] = [];
      }
      byBenchmark[dim.benchmark_id].push(dim);
    }
  });
  
  // Check vertical measurements using same benchmark
  Object.entries(byBenchmark).forEach(([benchmarkId, dims]) => {
    const benchmark = benchmarkMap.get(benchmarkId);
    
    if (!benchmark) {
      dims.forEach(dim => {
        issues.push({
          severity: 'critical',
          type: 'missing_benchmark',
          dimension_id: dim.id,
          dimension_type: dim.measurement_type,
          message: `References missing benchmark: ${dim.benchmark_label}`
        });
      });
      return;
    }
    
    // BM-C + BM-F should roughly equal F-C (within tolerance)
    const bmToFloor = dims.filter(d => d.measurement_type === 'BM-F');
    const bmToCeiling = dims.filter(d => d.measurement_type === 'BM-C');
    const floorToCeiling = dims.filter(d => d.measurement_type === 'F-C');
    
    if (bmToFloor.length > 0 && bmToCeiling.length > 0) {
      bmToFloor.forEach(bmf => {
        bmToCeiling.forEach(bmc => {
          const calculatedFC = getDimensionMm(bmf) + getDimensionMm(bmc);
          
          floorToCeiling.forEach(fc => {
            const recordedFC = getDimensionMm(fc);
            const diff = Math.abs(calculatedFC - recordedFC);
            
            // Allow 10mm tolerance
            if (diff > 10) {
              issues.push({
                severity: 'warning',
                type: 'benchmark_math',
                dimension_id: fc.id,
                dimension_type: fc.measurement_type,
                message: `BM-F (${formatImperial(bmf)}) + BM-C (${formatImperial(bmc)}) = ${Math.round(calculatedFC)}mm, but F-C is ${recordedFC}mm (${Math.round(diff)}mm difference)`
              });
            }
          });
        });
      });
    }
  });
  
  return issues;
}

/**
 * Detect measurement type logic issues
 */
function detectMeasurementTypeIssues(dimensions) {
  const issues = [];
  
  dimensions.forEach(dim => {
    // Vertical measurements must have benchmark
    if (['BM-C', 'BM-F', 'F-C'].includes(dim.measurement_type)) {
      if (!dim.benchmark_id) {
        issues.push({
          severity: 'critical',
          type: 'missing_benchmark',
          dimension_id: dim.id,
          dimension_type: dim.measurement_type,
          message: `${dim.measurement_type} requires benchmark reference`
        });
      }
    }
    
    // Benchmark-only measurements
    if (dim.measurement_type === 'BM') {
      if (!dim.benchmark_id) {
        issues.push({
          severity: 'critical',
          type: 'invalid_type',
          dimension_id: dim.id,
          dimension_type: dim.measurement_type,
          message: 'BM type requires benchmark reference'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Helper: Group dimensions by area
 */
function groupByArea(dimensions) {
  return dimensions.reduce((acc, dim) => {
    const area = dim.area || 'Unknown';
    if (!acc[area]) acc[area] = [];
    acc[area].push(dim);
    return acc;
  }, {});
}

/**
 * Calculate overall status
 */
function calculateOverallStatus(areaAnalysis) {
  const statuses = Object.values(areaAnalysis).map(a => a.status);
  
  if (statuses.includes('inconsistent')) return 'inconsistent';
  if (statuses.includes('needs_review')) return 'needs_review';
  return 'ok';
}

/**
 * Get dimension in mm
 */
function getDimensionMm(dim) {
  if (dim.value_mm) return dim.value_mm;
  
  const totalInches = (dim.value_feet || 0) * 12 + (dim.value_inches || 0);
  const fractionInches = parseFraction(dim.value_fraction || '0');
  return (totalInches + fractionInches) * 25.4;
}

/**
 * Parse fraction to decimal inches
 */
function parseFraction(fraction) {
  if (!fraction || fraction === '0') return 0;
  const parts = fraction.split('/');
  if (parts.length !== 2) return 0;
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

/**
 * Format imperial for display
 */
function formatImperial(dim) {
  let result = '';
  if (dim.value_feet) result += `${dim.value_feet}'`;
  if (dim.value_inches) result += ` ${dim.value_inches}`;
  if (dim.value_fraction && dim.value_fraction !== '0') result += ` ${dim.value_fraction}`;
  result += '"';
  return result.trim();
}

/**
 * Get status badge data
 */
export function getIntelligenceStatusBadge(status) {
  switch (status) {
    case 'ok':
      return {
        label: 'OK',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✓'
      };
    case 'needs_review':
      return {
        label: 'Needs Review',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '⚠'
      };
    case 'inconsistent':
      return {
        label: 'Inconsistent Data',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '✗'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: '?'
      };
  }
}