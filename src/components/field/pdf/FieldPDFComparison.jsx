/**
 * Field PDF Comparison
 * 
 * Compare two PDF revisions for factory disputes and QC audits
 */

/**
 * Compare two revisions
 */
export function compareRevisions(revision1, revision2) {
  const data1 = revision1.data_snapshot;
  const data2 = revision2.data_snapshot;
  
  return {
    revision_info: {
      rev1: { number: revision1.revision_number, date: new Date(revision1.created_at).toISOString(), author: revision1.created_by },
      rev2: { number: revision2.revision_number, date: new Date(revision2.created_at).toISOString(), author: revision2.created_by }
    },
    dimension_changes: compareDimensions(data1.dimensions, data2.dimensions),
    benchmark_changes: compareBenchmarks(data1.benchmarks, data2.benchmarks),
    summary: generateComparisonSummary(data1, data2)
  };
}

/**
 * Compare dimensions between revisions
 */
function compareDimensions(dims1, dims2) {
  const changes = [];
  
  // Find added dimensions
  dims2.forEach(dim2 => {
    const id = dim2.id || dim2.local_id;
    const exists = dims1.find(d1 => (d1.id || d1.local_id) === id);
    
    if (!exists) {
      changes.push({
        type: 'added',
        dimension_id: id,
        area: dim2.area,
        measurement_type: dim2.measurement_type,
        value: formatDimensionValue(dim2)
      });
    }
  });
  
  // Find removed dimensions
  dims1.forEach(dim1 => {
    const id = dim1.id || dim1.local_id;
    const exists = dims2.find(d2 => (d2.id || d2.local_id) === id);
    
    if (!exists) {
      changes.push({
        type: 'removed',
        dimension_id: id,
        area: dim1.area,
        measurement_type: dim1.measurement_type,
        value: formatDimensionValue(dim1)
      });
    }
  });
  
  // Find modified dimensions
  dims1.forEach(dim1 => {
    const id = dim1.id || dim1.local_id;
    const dim2 = dims2.find(d2 => (d2.id || d2.local_id) === id);
    
    if (dim2 && isDimensionModified(dim1, dim2)) {
      changes.push({
        type: 'modified',
        dimension_id: id,
        area: dim2.area,
        measurement_type: dim2.measurement_type,
        old_value: formatDimensionValue(dim1),
        new_value: formatDimensionValue(dim2),
        fields_changed: getChangedFields(dim1, dim2)
      });
    }
  });
  
  return changes;
}

/**
 * Compare benchmarks
 */
function compareBenchmarks(bms1, bms2) {
  const changes = [];
  
  bms2.forEach(bm2 => {
    const id = bm2.id || bm2.local_id;
    const bm1 = bms1.find(b => (b.id || b.local_id) === id);
    
    if (!bm1) {
      changes.push({
        type: 'added',
        benchmark_id: id,
        label: bm2.label,
        elevation: `${bm2.elevation} ${bm2.elevation_unit}`
      });
    } else if (bm1.elevation !== bm2.elevation) {
      changes.push({
        type: 'modified',
        benchmark_id: id,
        label: bm2.label,
        old_elevation: `${bm1.elevation} ${bm1.elevation_unit}`,
        new_elevation: `${bm2.elevation} ${bm2.elevation_unit}`
      });
    }
  });
  
  return changes;
}

/**
 * Check if dimension was modified
 */
function isDimensionModified(dim1, dim2) {
  return dim1.value_feet !== dim2.value_feet ||
         dim1.value_inches !== dim2.value_inches ||
         dim1.value_fraction !== dim2.value_fraction ||
         dim1.measurement_type !== dim2.measurement_type ||
         dim1.area !== dim2.area;
}

/**
 * Get changed fields
 */
function getChangedFields(dim1, dim2) {
  const fields = [];
  
  if (dim1.value_feet !== dim2.value_feet || dim1.value_inches !== dim2.value_inches || dim1.value_fraction !== dim2.value_fraction) {
    fields.push('value');
  }
  if (dim1.measurement_type !== dim2.measurement_type) {
    fields.push('type');
  }
  if (dim1.area !== dim2.area) {
    fields.push('area');
  }
  
  return fields;
}

/**
 * Format dimension value
 */
function formatDimensionValue(dim) {
  const feet = dim.value_feet || 0;
  const inches = dim.value_inches || 0;
  const fraction = dim.value_fraction || '0';
  
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
 * Generate comparison summary
 */
function generateComparisonSummary(data1, data2) {
  return {
    total_changes: 0,
    critical_changes: [],
    timestamp_comparison: {
      rev1: data1.dimension_set.updated_date,
      rev2: data2.dimension_set.updated_date
    }
  };
}