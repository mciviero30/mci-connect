/**
 * Relational Links for Field Dimensions
 * 
 * Manages relationships between:
 * - FieldDimension ↔ Photos
 * - FieldDimension ↔ Drawings/Plans
 * - Benchmark ↔ Dimensions
 */

/**
 * Link dimensions to photos
 */
export function linkDimensionToPhotos(dimension, photoIds) {
  return {
    ...dimension,
    photo_urls: [
      ...(dimension.photo_urls || []),
      ...photoIds
    ]
  };
}

/**
 * Get photos for dimension
 */
export function getDimensionPhotos(dimension, allPhotos) {
  if (!dimension.photo_urls || dimension.photo_urls.length === 0) {
    return [];
  }
  
  return allPhotos.filter(photo => 
    dimension.photo_urls.includes(photo.id) || 
    dimension.photo_urls.includes(photo.file_url)
  );
}

/**
 * Link dimension to drawing/plan
 */
export function linkDimensionToDrawing(dimension, planId, coordinates = null) {
  return {
    ...dimension,
    plan_id: planId,
    plan_coordinates: coordinates ? {
      x: coordinates.x,
      y: coordinates.y
    } : dimension.plan_coordinates
  };
}

/**
 * Get dimensions for a plan
 */
export function getDimensionsForPlan(planId, allDimensions) {
  return allDimensions.filter(dim => dim.plan_id === planId);
}

/**
 * Link dimension to benchmark
 */
export function linkDimensionToBenchmark(dimension, benchmark) {
  return {
    ...dimension,
    benchmark_id: benchmark.id,
    benchmark_label: benchmark.label,
    benchmark_elevation: benchmark.elevation,
    benchmark_elevation_unit: benchmark.elevation_unit
  };
}

/**
 * Get dimensions using a benchmark
 */
export function getDimensionsForBenchmark(benchmarkId, allDimensions) {
  return allDimensions.filter(dim => dim.benchmark_id === benchmarkId);
}

/**
 * Build dimension relationship graph
 */
export function buildDimensionGraph(dimensions, benchmarks, photos, plans) {
  const graph = {
    dimensions: [],
    benchmarks: [],
    photos: [],
    plans: [],
    relationships: {
      dimension_to_photo: [],
      dimension_to_plan: [],
      dimension_to_benchmark: [],
      benchmark_to_dimension: []
    }
  };
  
  // Process dimensions
  dimensions.forEach(dim => {
    graph.dimensions.push({
      id: dim.id,
      type: dim.measurement_type,
      area: dim.area,
      value: dim.value_feet || dim.value_mm
    });
    
    // Link to photos
    if (dim.photo_urls && dim.photo_urls.length > 0) {
      dim.photo_urls.forEach(photoId => {
        graph.relationships.dimension_to_photo.push({
          dimension_id: dim.id,
          photo_id: photoId
        });
      });
    }
    
    // Link to plan
    if (dim.plan_id) {
      graph.relationships.dimension_to_plan.push({
        dimension_id: dim.id,
        plan_id: dim.plan_id,
        coordinates: dim.plan_coordinates
      });
    }
    
    // Link to benchmark
    if (dim.benchmark_id) {
      graph.relationships.dimension_to_benchmark.push({
        dimension_id: dim.id,
        benchmark_id: dim.benchmark_id
      });
      
      graph.relationships.benchmark_to_dimension.push({
        benchmark_id: dim.benchmark_id,
        dimension_id: dim.id
      });
    }
  });
  
  // Process benchmarks
  benchmarks.forEach(bm => {
    graph.benchmarks.push({
      id: bm.id,
      label: bm.label,
      type: bm.type,
      elevation: bm.elevation,
      is_active: bm.is_active
    });
  });
  
  // Process photos
  photos.forEach(photo => {
    graph.photos.push({
      id: photo.id,
      file_url: photo.file_url,
      caption: photo.caption
    });
  });
  
  // Process plans
  plans.forEach(plan => {
    graph.plans.push({
      id: plan.id,
      name: plan.name,
      file_url: plan.file_url
    });
  });
  
  return graph;
}

/**
 * Find orphaned dimensions (no photos, no plan reference)
 */
export function findOrphanedDimensions(dimensions) {
  return dimensions.filter(dim => 
    (!dim.photo_urls || dim.photo_urls.length === 0) && 
    !dim.plan_id
  );
}

/**
 * Find incomplete benchmarks (no dimensions referencing them)
 */
export function findUnusedBenchmarks(benchmarks, dimensions) {
  const usedBenchmarkIds = new Set(
    dimensions
      .filter(d => d.benchmark_id)
      .map(d => d.benchmark_id)
  );
  
  return benchmarks.filter(bm => !usedBenchmarkIds.has(bm.id));
}

/**
 * Enrich dimension with related data
 */
export function enrichDimensionWithRelations(dimension, { photos = [], plans = [], benchmarks = [] }) {
  const enriched = { ...dimension };
  
  // Add photos
  if (dimension.photo_urls && dimension.photo_urls.length > 0) {
    enriched._photos = getDimensionPhotos(dimension, photos);
  }
  
  // Add plan
  if (dimension.plan_id) {
    enriched._plan = plans.find(p => p.id === dimension.plan_id);
  }
  
  // Add benchmark
  if (dimension.benchmark_id) {
    enriched._benchmark = benchmarks.find(b => b.id === dimension.benchmark_id);
  }
  
  return enriched;
}

/**
 * Batch enrich dimensions with relations
 */
export function batchEnrichDimensions(dimensions, relations) {
  return dimensions.map(dim => enrichDimensionWithRelations(dim, relations));
}

/**
 * Validate dimension relationships
 */
export function validateDimensionRelations(dimension, { photos = [], plans = [], benchmarks = [] }) {
  const warnings = [];
  const errors = [];
  
  // Check photo references
  if (dimension.photo_urls && dimension.photo_urls.length > 0) {
    const photoIds = new Set(photos.map(p => p.id).concat(photos.map(p => p.file_url)));
    dimension.photo_urls.forEach(photoId => {
      if (!photoIds.has(photoId)) {
        warnings.push(`Photo reference not found: ${photoId}`);
      }
    });
  }
  
  // Check plan reference
  if (dimension.plan_id) {
    const planExists = plans.some(p => p.id === dimension.plan_id);
    if (!planExists) {
      warnings.push(`Plan reference not found: ${dimension.plan_id}`);
    }
  }
  
  // Check benchmark reference
  if (dimension.benchmark_id) {
    const benchmark = benchmarks.find(b => b.id === dimension.benchmark_id);
    if (!benchmark) {
      errors.push(`Benchmark reference not found: ${dimension.benchmark_id}`);
    } else if (!benchmark.is_active) {
      warnings.push(`Referenced benchmark is inactive: ${benchmark.label}`);
    }
  }
  
  return { errors, warnings };
}