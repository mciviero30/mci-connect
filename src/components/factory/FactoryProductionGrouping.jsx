/**
 * Factory Production Grouping
 * 
 * Groups dimensions into independently fabricable units
 */

/**
 * Group dimensions for parallel production
 */
export function groupDimensionsForProduction(dimensions) {
  // Primary grouping by area
  const areaGroups = groupByArea(dimensions);
  
  // Secondary grouping by wall/elevation within each area
  const groups = [];
  
  Object.entries(areaGroups).forEach(([area, dims]) => {
    // Separate horizontal (wall) and vertical (elevation) dimensions
    const horizontal = dims.filter(d => d.dimension_type === 'horizontal');
    const vertical = dims.filter(d => d.dimension_type === 'vertical');
    
    // Group horizontal by wall sequence
    const wallGroups = groupByWallSequence(horizontal);
    
    // Create fabrication units
    wallGroups.forEach((wallDims, idx) => {
      groups.push({
        id: `${area}-wall-${idx + 1}`,
        type: 'wall',
        area,
        name: `${area} - Wall ${idx + 1}`,
        dimensions: wallDims,
        unit_type: inferUnitType(wallDims),
        is_fabricable: validateFabricable(wallDims),
        metadata: {
          dimension_count: wallDims.length,
          measurement_types: [...new Set(wallDims.map(d => d.measurement_type))],
          total_linear_feet: calculateTotalLinearFeet(wallDims),
          field_capture_date: getEarliestCaptureDate(wallDims),
          captured_by: getUniqueCapturers(wallDims)
        }
      });
    });
    
    // Vertical dimensions as separate group
    if (vertical.length > 0) {
      groups.push({
        id: `${area}-vertical`,
        type: 'vertical',
        area,
        name: `${area} - Vertical Dimensions`,
        dimensions: vertical,
        unit_type: 'vertical_assembly',
        is_fabricable: validateFabricable(vertical),
        metadata: {
          dimension_count: vertical.length,
          measurement_types: [...new Set(vertical.map(d => d.measurement_type))],
          field_capture_date: getEarliestCaptureDate(vertical),
          captured_by: getUniqueCapturers(vertical)
        }
      });
    }
  });
  
  return groups;
}

/**
 * Group dimensions by area
 */
function groupByArea(dimensions) {
  return dimensions.reduce((acc, dim) => {
    const area = dim.area || 'Unassigned';
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(dim);
    return acc;
  }, {});
}

/**
 * Group horizontal dimensions by wall sequence
 */
function groupByWallSequence(dimensions) {
  // Sort by measurement sequence or installation order
  const sorted = dimensions.sort((a, b) => {
    // Prioritize install_sequence if available
    if (a.install_sequence && b.install_sequence) {
      return a.install_sequence - b.install_sequence;
    }
    // Fallback to created_date
    return new Date(a.measurement_date || a.created_date) - new Date(b.measurement_date || b.created_date);
  });
  
  // Group by measurement type (FF-FF, CL-CL, etc.)
  const typeGroups = {};
  sorted.forEach(dim => {
    const type = dim.measurement_type;
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push(dim);
  });
  
  // Return as array of groups
  return Object.values(typeGroups).filter(group => group.length > 0);
}

/**
 * Infer unit type from dimensions
 */
function inferUnitType(dimensions) {
  if (dimensions.length === 0) return 'unknown';
  
  const types = dimensions.map(d => d.measurement_type);
  const materials = dimensions.map(d => d.material_type).filter(Boolean);
  
  // Check for glass wall indicators
  if (types.includes('FF-FF') || types.includes('CL-CL')) {
    return 'glass_wall';
  }
  
  // Check for solid wall
  if (materials.includes('solid') || materials.includes('drywall')) {
    return 'solid_wall';
  }
  
  // Default to generic unit
  return 'assembly_unit';
}

/**
 * Validate if group is fabricable
 */
function validateFabricable(dimensions) {
  if (dimensions.length === 0) return false;
  
  // All dimensions must be production-ready
  const allProductionReady = dimensions.every(d => 
    d.status === 'production_ready' || d.status === 'verified'
  );
  
  // Must have complete measurements
  const allComplete = dimensions.every(d => 
    d.measurement_type && 
    (d.value_feet !== undefined || d.value_mm !== undefined)
  );
  
  // Must have material type (if required)
  const hasMaterial = dimensions.some(d => d.material_type);
  
  return allProductionReady && allComplete;
}

/**
 * Calculate total linear feet
 */
function calculateTotalLinearFeet(dimensions) {
  return dimensions.reduce((total, dim) => {
    const feet = dim.value_feet || 0;
    const inches = (dim.value_inches || 0) / 12;
    return total + feet + inches;
  }, 0).toFixed(2);
}

/**
 * Get earliest capture date
 */
function getEarliestCaptureDate(dimensions) {
  const dates = dimensions
    .map(d => d.measurement_date || d.created_date)
    .filter(Boolean)
    .sort();
  
  return dates[0] || null;
}

/**
 * Get unique capturers
 */
function getUniqueCapturers(dimensions) {
  const capturers = dimensions
    .map(d => d.measured_by_name || d.measured_by)
    .filter(Boolean);
  
  return [...new Set(capturers)];
}

/**
 * Export group as PDF packet
 */
export function prepareGroupForExport(group, job, dimensionSet) {
  return {
    group_id: group.id,
    packet_name: `${job.name} - ${group.name}`,
    type: group.type,
    
    // Production metadata
    production_metadata: {
      job_id: job.id,
      job_name: job.name,
      customer: job.customer_name,
      area: group.area,
      unit_type: group.unit_type,
      dimension_set_id: dimensionSet.id,
      dimension_set_name: dimensionSet.name,
      revision: dimensionSet.version_number || 1
    },
    
    // Dimensions for this packet
    dimensions: group.dimensions.map(dim => ({
      ...dim,
      _packet_group: group.id,
      _traceability: {
        field_capture_date: dim.measurement_date || dim.created_date,
        captured_by: dim.measured_by_name || dim.measured_by,
        verified_by: dim.verified_by,
        verified_date: dim.verified_date
      }
    })),
    
    // Fabrication data
    fabrication: {
      is_fabricable: group.is_fabricable,
      total_dimensions: group.metadata.dimension_count,
      total_linear_feet: group.metadata.total_linear_feet,
      measurement_types: group.metadata.measurement_types
    },
    
    // Traceability
    traceability: {
      original_field_capture: group.metadata.field_capture_date,
      captured_by: group.metadata.captured_by,
      approved_by: dimensionSet.approved_by_name || dimensionSet.approved_by,
      approved_at: dimensionSet.approved_at,
      locked_at: dimensionSet.locked_at
    }
  };
}

/**
 * Get production summary
 */
export function getProductionSummary(groups) {
  return {
    total_groups: groups.length,
    fabricable_groups: groups.filter(g => g.is_fabricable).length,
    total_dimensions: groups.reduce((sum, g) => sum + g.dimensions.length, 0),
    
    by_type: groups.reduce((acc, g) => {
      if (!acc[g.type]) {
        acc[g.type] = 0;
      }
      acc[g.type]++;
      return acc;
    }, {}),
    
    by_area: groups.reduce((acc, g) => {
      if (!acc[g.area]) {
        acc[g.area] = { groups: 0, dimensions: 0 };
      }
      acc[g.area].groups++;
      acc[g.area].dimensions += g.dimensions.length;
      return acc;
    }, {})
  };
}