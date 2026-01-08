/**
 * Field PDF Metadata Generator
 * 
 * Generates comprehensive metadata for PDF audit and traceability
 */

/**
 * Generate PDF metadata
 */
export function generatePDFMetadata(dataset, pdfResult) {
  const metadata = {
    // Document identification
    document_id: dataset.metadata.document_id,
    revision_number: dataset.metadata.revision_number,
    generated_at: dataset.metadata.generated_at,
    generated_by: dataset.metadata.generated_by,
    
    // Project reference
    job_id: dataset.job.id,
    job_name: dataset.job.name,
    dimension_set_id: dataset.dimension_set.id,
    dimension_set_name: dataset.dimension_set.name,
    
    // Data summary
    data_summary: {
      total_dimensions: dataset.dimensions.length,
      wall_dimensions: dataset.dimensions.filter(d => 
        ['FF-FF', 'FF-CL', 'CL-FF', 'CL-CL'].includes(d.measurement_type)
      ).length,
      vertical_dimensions: dataset.dimensions.filter(d => 
        ['BM-C', 'BM-F', 'F-C'].includes(d.measurement_type)
      ).length,
      benchmarks: dataset.benchmarks.length,
      areas: [...new Set(dataset.dimensions.map(d => d.area))].length
    },
    
    // Dimension breakdown
    dimensions_by_type: calculateDimensionsByType(dataset.dimensions),
    
    // Benchmark data
    benchmark_data: dataset.benchmarks.map(bm => ({
      label: bm.label,
      type: bm.type,
      color_code: bm.color_code,
      elevation: bm.elevation,
      area: bm.area,
      is_active: bm.is_active
    })),
    
    // Approval trail
    approval_trail: {
      workflow_state: dataset.dimension_set.workflow_state,
      approved_by: dataset.dimension_set.approved_by,
      approved_at: dataset.dimension_set.approved_at,
      is_locked: dataset.dimension_set.is_locked,
      locked_at: dataset.dimension_set.locked_at
    },
    
    // Technical metadata
    technical: {
      page_count: dataset.metadata.page_count,
      file_size: pdfResult.blob.size,
      offline_generated: dataset.metadata.offline_generated,
      pdf_version: '1.0',
      schema_version: '1.0'
    }
  };
  
  return metadata;
}

/**
 * Calculate dimensions by type
 */
function calculateDimensionsByType(dimensions) {
  const byType = {};
  
  dimensions.forEach(dim => {
    const type = dim.measurement_type;
    if (!byType[type]) {
      byType[type] = 0;
    }
    byType[type]++;
  });
  
  return byType;
}

/**
 * Generate benchmark manifest
 */
export function generateBenchmarkManifest(benchmarks, dimensions) {
  return benchmarks.map(bm => {
    const references = dimensions.filter(d => 
      d.benchmark_id === bm.id || 
      d.benchmark_label === bm.label
    );
    
    return {
      label: bm.label,
      color_code: bm.color_code,
      elevation: bm.elevation,
      elevation_unit: bm.elevation_unit,
      type: bm.type,
      area: bm.area,
      reference_count: references.length,
      referenced_measurements: references.map(d => d.measurement_type),
      is_active: bm.is_active,
      traceability: {
        established_by: bm.established_by,
        established_date: bm.established_date,
        source_id: bm.id || bm.local_id
      }
    };
  });
}