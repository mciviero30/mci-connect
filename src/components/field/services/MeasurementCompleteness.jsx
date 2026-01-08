/**
 * Measurement Completeness & Evidence Checker
 * 
 * Validates documentation completeness for dispute protection
 * NO ASSUMPTIONS - Reports only what exists
 */

/**
 * Check completeness for all areas in a job
 */
export function checkMeasurementCompleteness(dimensions, benchmarks, photos) {
  const byArea = groupByArea(dimensions);
  const areaResults = {};

  Object.entries(byArea).forEach(([area, areaDims]) => {
    areaResults[area] = checkAreaCompleteness(areaDims, benchmarks, photos, area);
  });

  return {
    areas: areaResults,
    overall_status: calculateOverallCompleteness(areaResults)
  };
}

/**
 * Check completeness for single area
 */
function checkAreaCompleteness(dimensions, benchmarks, photos, area) {
  const checks = [];
  
  // Check 1: Measurement Types Coverage
  checks.push(checkMeasurementTypesCoverage(dimensions));
  
  // Check 2: Benchmark Presence
  checks.push(checkBenchmarkPresence(dimensions, benchmarks));
  
  // Check 3: Laser Heights Recorded
  checks.push(checkLaserHeights(dimensions));
  
  // Check 4: Photo Evidence
  checks.push(checkPhotoEvidence(dimensions, photos, area));
  
  // Check 5: Audio/Video Notes (optional)
  checks.push(checkAudioVideoNotes(dimensions));
  
  const completed = checks.filter(c => c.status === 'complete').length;
  const missing = checks.filter(c => c.status === 'missing').length;
  const incomplete = checks.filter(c => c.status === 'incomplete').length;
  
  let status = 'complete';
  if (incomplete > 0 || missing > 0) status = 'incomplete';
  
  return {
    status,
    dimension_count: dimensions.length,
    checks,
    summary: {
      completed,
      missing,
      incomplete,
      total: checks.length
    }
  };
}

/**
 * Check 1: Required measurement types present
 */
function checkMeasurementTypesCoverage(dimensions) {
  const foundTypes = new Set(dimensions.map(d => d.measurement_type));
  const requiredTypes = ['FF-FF', 'CL-CL', 'BM-C', 'BM-F'];
  const missing = requiredTypes.filter(t => !foundTypes.has(t));
  
  return {
    id: 'measurement_types',
    label: 'Required Measurement Types',
    status: missing.length === 0 ? 'complete' : 'incomplete',
    details: missing.length === 0 
      ? `All required types present: ${Array.from(foundTypes).join(', ')}`
      : `Missing required types: ${missing.join(', ')}`,
    required: true
  };
}

/**
 * Check 2: Benchmark presence (laser line recorded)
 */
function checkBenchmarkPresence(dimensions, benchmarks) {
  const benchmarkIds = new Set(benchmarks.map(b => b.id));
  const dimsWithBenchmark = dimensions.filter(d => 
    d.benchmark_id && benchmarkIds.has(d.benchmark_id)
  );
  
  const bmTypes = dimensions.filter(d => 
    ['BM-C', 'BM-F', 'F-C', 'BM'].includes(d.measurement_type)
  );
  
  let status = 'complete';
  let details = '';
  
  if (benchmarks.length === 0) {
    status = 'incomplete';
    details = 'No benchmarks recorded for this area';
  } else if (bmTypes.length > 0 && dimsWithBenchmark.length === 0) {
    status = 'incomplete';
    details = `${bmTypes.length} measurements require benchmark reference but none linked`;
  } else {
    details = `${benchmarks.length} benchmark(s) established, ${dimsWithBenchmark.length} measurements linked`;
  }
  
  return {
    id: 'benchmarks',
    label: 'Benchmark Presence (Laser Line)',
    status,
    details,
    required: true
  };
}

/**
 * Check 3: Laser heights recorded
 */
function checkLaserHeights(dimensions) {
  const laserHeightTypes = ['BM-C', 'BM-F'];
  const laserDims = dimensions.filter(d => laserHeightTypes.includes(d.measurement_type));
  
  if (laserDims.length === 0) {
    return {
      id: 'laser_heights',
      label: 'Laser Heights Recorded',
      status: 'missing',
      details: 'No laser height measurements (BM-C, BM-F) found',
      required: true
    };
  }
  
  const complete = laserDims.filter(d => 
    (d.value_feet !== null && d.value_feet !== undefined) ||
    (d.value_mm !== null && d.value_mm !== undefined)
  );
  
  const status = complete.length === laserDims.length ? 'complete' : 'incomplete';
  const details = `${complete.length}/${laserDims.length} laser height measurements have values`;
  
  return {
    id: 'laser_heights',
    label: 'Laser Heights Recorded',
    status,
    details,
    required: true
  };
}

/**
 * Check 4: Photo evidence attached
 */
function checkPhotoEvidence(dimensions, photos, area) {
  // Filter photos for this area
  const areaPhotos = photos.filter(p => 
    p.area === area || p.location === area
  );
  
  // Check if dimensions have photo references
  const dimsWithPhotos = dimensions.filter(d => 
    d.photo_urls && d.photo_urls.length > 0
  );
  
  let status = 'incomplete';
  let details = '';
  
  if (areaPhotos.length === 0 && dimsWithPhotos.length === 0) {
    status = 'missing';
    details = 'No photo evidence attached to measurements';
  } else if (areaPhotos.length > 0 || dimsWithPhotos.length > 0) {
    status = 'complete';
    details = `${areaPhotos.length} area photo(s), ${dimsWithPhotos.length} measurement(s) with photo references`;
  }
  
  return {
    id: 'photos',
    label: 'Photo Evidence',
    status,
    details,
    required: true
  };
}

/**
 * Check 5: Audio/Video notes (optional)
 */
function checkAudioVideoNotes(dimensions) {
  const withNotes = dimensions.filter(d => 
    d.notes || d.production_notes || d.voice_note_url || d.video_url
  );
  
  const status = withNotes.length > 0 ? 'complete' : 'missing';
  const details = withNotes.length > 0 
    ? `${withNotes.length} measurement(s) have audio/video notes`
    : 'No audio/video notes attached (optional)';
  
  return {
    id: 'audio_video',
    label: 'Audio/Video Notes',
    status,
    details,
    required: false
  };
}

/**
 * Helper: Group dimensions by area
 */
function groupByArea(dimensions) {
  return dimensions.reduce((acc, dim) => {
    const area = dim.area || 'Unknown Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(dim);
    return acc;
  }, {});
}

/**
 * Calculate overall completeness
 */
function calculateOverallCompleteness(areaResults) {
  const statuses = Object.values(areaResults).map(a => a.status);
  
  if (statuses.every(s => s === 'complete')) return 'complete';
  if (statuses.some(s => s === 'incomplete')) return 'incomplete';
  return 'incomplete';
}

/**
 * Get status badge data
 */
export function getCompletenessStatusBadge(status) {
  switch (status) {
    case 'complete':
      return {
        label: '✔ Completed',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✔'
      };
    case 'incomplete':
      return {
        label: '❌ Incomplete',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌'
      };
    case 'missing':
      return {
        label: '⚠ Missing Evidence',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '⚠'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: '?'
      };
  }
}

/**
 * Get check status badge
 */
export function getCheckStatusBadge(status) {
  switch (status) {
    case 'complete':
      return { icon: '✔', color: 'text-green-600' };
    case 'incomplete':
      return { icon: '❌', color: 'text-red-600' };
    case 'missing':
      return { icon: '⚠', color: 'text-amber-600' };
    default:
      return { icon: '?', color: 'text-slate-600' };
  }
}