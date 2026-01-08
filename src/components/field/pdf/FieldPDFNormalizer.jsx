/**
 * Field PDF Normalizer
 * 
 * Normalizes and sorts data for deterministic PDF output
 */

/**
 * Normalize dataset for PDF
 */
export function normalizeForPDF(dataset) {
  return {
    job: normalizeJob(dataset.job),
    dimension_set: normalizeDimensionSet(dataset.dimension_set),
    dimensions: normalizeDimensions(dataset.dimensions),
    benchmarks: normalizeBenchmarks(dataset.benchmarks),
    photos: normalizePhotos(dataset.photos),
    plans: normalizePlans(dataset.plans),
    metadata: normalizeMetadata(dataset.metadata)
  };
}

/**
 * Normalize job data
 */
function normalizeJob(job) {
  return {
    id: job.id || job.local_id,
    name: job.name || job.job_name || 'Unnamed Project',
    address: formatAddress(job),
    customer_name: job.customer_name || 'N/A',
    job_number: job.job_number || 'N/A',
    description: job.description || ''
  };
}

/**
 * Format address
 */
function formatAddress(job) {
  const parts = [
    job.address,
    job.city,
    job.state,
    job.zip
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}

/**
 * Normalize dimension set
 */
function normalizeDimensionSet(set) {
  return {
    id: set.id || set.local_id,
    name: set.name || 'Dimension Set',
    area: set.area || 'N/A',
    workflow_state: set.workflow_state || 'draft',
    version_number: set.version_number || 1,
    captured_by: set.captured_by_name || set.captured_by || 'Unknown',
    capture_date: formatDate(set.capture_date || set.created_date),
    approved_by: set.approved_by_name || set.approved_by,
    approved_at: formatDate(set.approved_at),
    is_locked: set.is_locked || false,
    locked_at: formatDate(set.locked_at)
  };
}

/**
 * Normalize dimensions (sort deterministically)
 */
function normalizeDimensions(dimensions) {
  const normalized = dimensions.map(d => ({
    id: d.id || d.local_id,
    area: d.area || 'N/A',
    measurement_type: d.measurement_type || 'N/A',
    dimension_type: d.dimension_type || 'horizontal',
    value_feet: d.value_feet || 0,
    value_inches: d.value_inches || 0,
    value_fraction: d.value_fraction || '0',
    value_mm: d.value_mm || 0,
    unit_system: d.unit_system || 'imperial',
    display_value_imperial: formatImperialValue(d),
    display_value_metric: `${d.value_mm || 0} mm`,
    benchmark_label: d.benchmark_label || null,
    benchmark_id: d.benchmark_id || null,
    measured_by: d.measured_by_name || d.measured_by || 'Unknown',
    measurement_date: formatDate(d.measurement_date || d.created_date),
    status: d.status || 'draft',
    notes: d.notes || '',
    tolerance_plus: d.tolerance?.plus || 0,
    tolerance_minus: d.tolerance?.minus || 0
  }));
  
  // Sort: by area, then measurement type order, then value
  return normalized.sort((a, b) => {
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    
    const typeOrder = ['FF-FF', 'FF-CL', 'CL-FF', 'CL-CL', 'BM-C', 'BM-F', 'F-C', 'BM'];
    const aIndex = typeOrder.indexOf(a.measurement_type);
    const bIndex = typeOrder.indexOf(b.measurement_type);
    
    if (aIndex !== bIndex) return aIndex - bIndex;
    
    const totalA = (a.value_feet || 0) * 12 + (a.value_inches || 0);
    const totalB = (b.value_feet || 0) * 12 + (b.value_inches || 0);
    return totalA - totalB;
  });
}

/**
 * Format imperial value
 */
function formatImperialValue(dimension) {
  const feet = dimension.value_feet || 0;
  const inches = dimension.value_inches || 0;
  const fraction = dimension.value_fraction || '0';
  
  let display = '';
  if (feet > 0) display += `${feet}'`;
  if (inches > 0 || fraction !== '0') {
    if (feet > 0) display += ' ';
    display += `${inches}`;
    if (fraction !== '0') display += ` ${fraction}`;
    display += '"';
  } else if (feet === 0) {
    display = '0"';
  }
  
  return display.trim();
}

/**
 * Format dimension value
 */
function formatDimensionValue(dimension) {
  if (dimension.unit_system === 'metric') {
    return `${dimension.value_mm || 0} mm`;
  }
  
  const feet = dimension.value_feet || 0;
  const inches = dimension.value_inches || 0;
  const fraction = dimension.value_fraction || '0';
  
  let display = '';
  if (feet > 0) display += `${feet}'`;
  if (inches > 0 || fraction !== '0') {
    display += ` ${inches}`;
    if (fraction !== '0') display += ` ${fraction}`;
    display += '"';
  }
  
  return display.trim() || '0"';
}

/**
 * Normalize benchmarks
 */
function normalizeBenchmarks(benchmarks) {
  return benchmarks.map((b, idx) => ({
    id: b.id || b.local_id,
    label: b.label || `BM-${idx + 1}`,
    type: b.type || 'laser',
    elevation: b.elevation || 0,
    elevation_unit: b.elevation_unit || 'in',
    area: b.area || 'N/A',
    description: b.description || '',
    color_code: getBenchmarkColorCode(b.label || `BM-${idx + 1}`),
    is_active: b.is_active !== false,
    established_by: b.established_by_name || b.established_by || 'Unknown',
    established_date: formatDate(b.established_date || b.created_date),
    reference_count: 0 // Will be calculated
  })).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get benchmark color code
 */
function getBenchmarkColorCode(label) {
  // Deterministic color based on label
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
  const hash = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Normalize photos
 */
function normalizePhotos(photos) {
  return photos.map(p => ({
    id: p.id || p.local_id,
    url: p.url || p.local_blob_url,
    caption: p.caption || '',
    area: p.area || 'N/A',
    captured_date: formatDate(p.created_date)
  })).sort((a, b) => a.area.localeCompare(b.area));
}

/**
 * Normalize plans
 */
function normalizePlans(plans) {
  return plans.map(p => ({
    id: p.id || p.local_id,
    name: p.name || 'Plan',
    url: p.url || p.local_blob_url
  }));
}

/**
 * Normalize metadata
 */
function normalizeMetadata(metadata) {
  return {
    generated_at: formatDateTime(metadata.generated_at),
    generated_by: metadata.generated_by_name || metadata.generated_by || 'Unknown',
    revision_number: metadata.revision_number || 1,
    document_id: metadata.document_id,
    offline_generated: metadata.offline_generated || false,
    page_count: 0 // Will be set by PDF generator
  };
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format date-time
 */
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'N/A';
  }
}