/**
 * Factory Comparison Service
 * 
 * Compare Field-captured vs Production-approved dimensions
 * Critical for dispute resolution and QC accountability
 */

import { base44 } from '@/api/base44Client';

/**
 * Compare two dimension set revisions
 */
export async function compareDimensionSets(originalSetId, revisedSetId) {
  try {
    const [original, revised] = await Promise.all([
      fetchRevisionData(originalSetId),
      fetchRevisionData(revisedSetId)
    ]);

    const comparison = {
      original,
      revised,
      deltas: calculateDeltas(original.dimensions, revised.dimensions),
      summary: generateComparisonSummary(original, revised),
      metadata: {
        compared_at: new Date().toISOString(),
        original_revision: original.dimension_set.version_number,
        revised_revision: revised.dimension_set.version_number
      }
    };

    return comparison;
  } catch (error) {
    console.error('Comparison failed:', error);
    throw error;
  }
}

/**
 * Fetch revision data
 */
async function fetchRevisionData(setId) {
  const dimensionSet = await base44.entities.DimensionSet.filter({ 
    id: setId 
  }).then(sets => sets[0]);

  if (!dimensionSet) {
    throw new Error(`Dimension set ${setId} not found`);
  }

  const dimensions = await base44.entities.FieldDimension.filter({
    id: { $in: dimensionSet.dimension_ids || [] }
  });

  const benchmarks = await base44.entities.Benchmark.filter({
    job_id: dimensionSet.job_id
  });

  return {
    dimension_set: dimensionSet,
    dimensions,
    benchmarks
  };
}

/**
 * Calculate deltas between two dimension arrays
 */
function calculateDeltas(originalDims, revisedDims) {
  const deltas = {
    added: [],
    removed: [],
    modified: [],
    unchanged: []
  };

  const revisedMap = new Map(revisedDims.map(d => [d.id, d]));
  const originalMap = new Map(originalDims.map(d => [d.id, d]));

  // Find removed and modified
  originalDims.forEach(origDim => {
    const revisedDim = revisedMap.get(origDim.id);
    
    if (!revisedDim) {
      deltas.removed.push({
        dimension: origDim,
        reason: 'Removed in production'
      });
    } else {
      const changes = compareIndividualDimension(origDim, revisedDim);
      
      if (changes.has_changes) {
        deltas.modified.push({
          original: origDim,
          revised: revisedDim,
          changes
        });
      } else {
        deltas.unchanged.push({
          dimension: origDim
        });
      }
    }
  });

  // Find added
  revisedDims.forEach(revisedDim => {
    if (!originalMap.has(revisedDim.id)) {
      deltas.added.push({
        dimension: revisedDim,
        reason: 'Added during production'
      });
    }
  });

  return deltas;
}

/**
 * Compare individual dimension
 */
function compareIndividualDimension(original, revised) {
  const changes = {
    has_changes: false,
    value_changed: false,
    benchmark_changed: false,
    notes_changed: false,
    factory_annotations_added: false,
    details: []
  };

  // Value changes
  if (
    original.value_feet !== revised.value_feet ||
    original.value_inches !== revised.value_inches ||
    original.value_fraction !== revised.value_fraction ||
    original.value_mm !== revised.value_mm
  ) {
    changes.has_changes = true;
    changes.value_changed = true;
    changes.details.push({
      field: 'measurement_value',
      original: formatImperial(original),
      revised: formatImperial(revised),
      severity: 'critical'
    });
  }

  // Benchmark changes
  if (original.benchmark_id !== revised.benchmark_id) {
    changes.has_changes = true;
    changes.benchmark_changed = true;
    changes.details.push({
      field: 'benchmark',
      original: original.benchmark_label || 'None',
      revised: revised.benchmark_label || 'None',
      severity: 'high'
    });
  }

  // Notes changes
  if (original.production_notes !== revised.production_notes) {
    changes.has_changes = true;
    changes.notes_changed = true;
    changes.details.push({
      field: 'production_notes',
      original: original.production_notes || 'None',
      revised: revised.production_notes || 'None',
      severity: 'medium'
    });
  }

  // Factory annotations (can only be added, not present in original)
  if (
    revised.factory_production_notes ||
    revised.factory_cut_instructions ||
    revised.factory_material_constraints
  ) {
    if (
      revised.factory_production_notes !== original.factory_production_notes ||
      revised.factory_cut_instructions !== original.factory_cut_instructions ||
      revised.factory_material_constraints !== original.factory_material_constraints
    ) {
      changes.has_changes = true;
      changes.factory_annotations_added = true;
      changes.details.push({
        field: 'factory_annotations',
        original: 'None',
        revised: 'Added',
        severity: 'info'
      });
    }
  }

  return changes;
}

/**
 * Generate comparison summary
 */
function generateComparisonSummary(original, revised) {
  return {
    original_count: original.dimensions.length,
    revised_count: revised.dimensions.length,
    original_date: original.dimension_set.capture_date,
    revised_date: original.dimension_set.updated_date,
    original_captured_by: original.dimension_set.captured_by_name,
    revised_by: original.dimension_set.approved_by_name,
    workflow_original: original.dimension_set.workflow_state,
    workflow_revised: revised.dimension_set.workflow_state,
    production_status_original: original.dimension_set.production_status,
    production_status_revised: revised.dimension_set.production_status
  };
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
 * Get revision history for a dimension set
 */
export async function getRevisionHistory(dimensionSetId) {
  try {
    const history = [];
    
    // Get the original set
    const currentSet = await base44.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!currentSet) return [];
    
    history.push(currentSet);
    
    // Walk back through parent versions
    let parentId = currentSet.parent_version_id;
    while (parentId) {
      const parent = await base44.entities.DimensionSet.filter({ 
        id: parentId 
      }).then(sets => sets[0]);
      
      if (!parent) break;
      
      history.push(parent);
      parentId = parent.parent_version_id;
    }
    
    // Reverse to get chronological order
    return history.reverse();
  } catch (error) {
    console.error('Failed to get revision history:', error);
    return [];
  }
}