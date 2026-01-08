/**
 * Factory Production Filter
 * 
 * Filters data to show ONLY production-ready information
 */

/**
 * Filter dimensions for production
 */
export function filterProductionDimensions(dimensions) {
  return dimensions.filter(dim => {
    // Must be production_ready or verified
    if (dim.status !== 'production_ready' && dim.status !== 'verified') {
      return false;
    }
    
    // Must have complete measurement data
    if (!dim.measurement_type || !dim.unit_system) {
      return false;
    }
    
    // Must have valid value
    const hasImperialValue = (dim.value_feet !== undefined && dim.value_feet !== null) || 
                             (dim.value_inches !== undefined && dim.value_inches !== null);
    const hasMetricValue = dim.value_mm !== undefined && dim.value_mm !== null;
    
    if (!hasImperialValue && !hasMetricValue) {
      return false;
    }
    
    // Must have area reference
    if (!dim.area) {
      return false;
    }
    
    return true;
  });
}

/**
 * Filter benchmarks for production
 */
export function filterProductionBenchmarks(benchmarks) {
  return benchmarks.filter(bm => {
    // Must be active
    if (bm.is_active !== true) {
      return false;
    }
    
    // Must have elevation data
    if (!bm.elevation || !bm.elevation_unit) {
      return false;
    }
    
    // Must have label
    if (!bm.label) {
      return false;
    }
    
    // Must be established (not temporary)
    if (!bm.established_date || !bm.established_by) {
      return false;
    }
    
    return true;
  });
}

/**
 * Filter photos for production
 */
export function filterProductionPhotos(photos) {
  return photos.filter(photo => {
    // Must be marked as production-relevant
    if (photo.is_production_reference !== true) {
      return false;
    }
    
    // Skip temporary field photos
    if (photo.category === 'field_note' || photo.category === 'temporary') {
      return false;
    }
    
    // Must have valid URL
    if (!photo.url && !photo.photo_url) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get latest revision only
 */
export function getLatestRevision(dimensionSets) {
  if (dimensionSets.length === 0) return null;
  
  // Group by parent chain
  const groups = {};
  
  dimensionSets.forEach(set => {
    const rootId = set.parent_version_id || set.id;
    if (!groups[rootId]) {
      groups[rootId] = [];
    }
    groups[rootId].push(set);
  });
  
  // Get latest from each group
  const latestSets = Object.values(groups).map(group => {
    return group.sort((a, b) => 
      (b.version_number || 1) - (a.version_number || 1)
    )[0];
  });
  
  return latestSets;
}

/**
 * Filter complete factory dataset
 */
export function filterForProduction(data) {
  return {
    job: data.job,
    dimension_set: data.dimension_set,
    dimensions: filterProductionDimensions(data.dimensions || []),
    benchmarks: filterProductionBenchmarks(data.benchmarks || []),
    photos: filterProductionPhotos(data.photos || []),
    metadata: {
      ...data.metadata,
      filtered_at: new Date().toISOString(),
      filter_applied: 'production_only',
      original_counts: {
        dimensions: data.dimensions?.length || 0,
        benchmarks: data.benchmarks?.length || 0,
        photos: data.photos?.length || 0
      },
      filtered_counts: {
        dimensions: filterProductionDimensions(data.dimensions || []).length,
        benchmarks: filterProductionBenchmarks(data.benchmarks || []).length,
        photos: filterProductionPhotos(data.photos || []).length
      }
    }
  };
}

/**
 * Validate production readiness
 */
export function validateProductionReadiness(dimensionSet, dimensions) {
  const issues = [];
  
  // Must be approved or locked
  if (dimensionSet.workflow_state !== 'approved' && !dimensionSet.is_locked) {
    issues.push('Dimension set not approved for production');
  }
  
  // Must have supervisor approval
  if (!dimensionSet.approved_by) {
    issues.push('Missing supervisor approval');
  }
  
  // Must have production-ready dimensions
  const productionDims = filterProductionDimensions(dimensions);
  if (productionDims.length === 0) {
    issues.push('No production-ready dimensions found');
  }
  
  // Check for incomplete measurements
  const incompleteDims = dimensions.filter(d => 
    d.status === 'draft' || !d.measurement_type
  );
  if (incompleteDims.length > 0) {
    issues.push(`${incompleteDims.length} incomplete dimension(s) - will be hidden from production view`);
  }
  
  return {
    is_ready: issues.length === 0,
    issues,
    production_dimension_count: productionDims.length,
    total_dimension_count: dimensions.length
  };
}