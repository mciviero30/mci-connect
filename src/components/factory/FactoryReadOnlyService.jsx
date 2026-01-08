/**
 * Factory Read-Only Service
 * 
 * Provides read-only data access for Factory mode
 */

import { validateFactoryAccess } from './FactoryPermissions';
import { MODES } from './FactoryModeContext';

/**
 * Fetch dimension sets for Factory mode (approved/locked only)
 */
export async function fetchFactoryDimensionSets(jobId, base44Client) {
  try {
    const sets = await base44Client.entities.DimensionSet.filter({
      job_id: jobId,
      workflow_state: { $in: ['approved', 'locked'] }
    }, '-created_date');
    
    return sets;
  } catch (error) {
    console.error('Failed to fetch Factory dimension sets:', error);
    throw error;
  }
}

/**
 * Fetch locked dimension sets for production
 */
export async function fetchProductionReady(jobId, base44Client) {
  try {
    const sets = await base44Client.entities.DimensionSet.filter({
      job_id: jobId,
      is_locked: true
    }, '-locked_at');
    
    return sets;
  } catch (error) {
    console.error('Failed to fetch production-ready sets:', error);
    throw error;
  }
}

/**
 * Fetch dimension set with access validation
 */
export async function fetchDimensionSetWithValidation(dimensionSetId, mode, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Validate Factory access
    if (mode === MODES.FACTORY) {
      const access = validateFactoryAccess(dimensionSet, mode);
      
      if (!access.allowed) {
        throw new Error(access.reason);
      }
    }
    
    return dimensionSet;
  } catch (error) {
    console.error('Failed to fetch dimension set:', error);
    throw error;
  }
}

/**
 * Fetch dimensions for read-only view
 */
export async function fetchDimensionsReadOnly(dimensionIds, base44Client) {
  try {
    if (!dimensionIds || dimensionIds.length === 0) {
      return [];
    }
    
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionIds }
    });
    
    // Mark as read-only
    return dimensions.map(d => ({
      ...d,
      _readonly: true
    }));
  } catch (error) {
    console.error('Failed to fetch dimensions:', error);
    throw error;
  }
}

/**
 * Get production summary for locked set
 */
export async function getProductionSummary(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet || !dimensionSet.is_locked) {
      throw new Error('Set must be locked for production summary');
    }
    
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids }
    });
    
    // Calculate summary
    const summary = {
      dimension_set_id: dimensionSet.id,
      dimension_set_name: dimensionSet.name,
      version_number: dimensionSet.version_number,
      locked_at: dimensionSet.locked_at,
      locked_by: dimensionSet.locked_by_name,
      approval_confidence: dimensionSet.approval_confidence_score,
      total_measurements: dimensions.length,
      by_type: {},
      by_unit: {
        imperial: 0,
        metric: 0
      }
    };
    
    dimensions.forEach(d => {
      // Count by type
      const type = d.measurement_type || 'unknown';
      summary.by_type[type] = (summary.by_type[type] || 0) + 1;
      
      // Count by unit
      const unit = d.unit_system || 'imperial';
      summary.by_unit[unit] = (summary.by_unit[unit] || 0) + 1;
    });
    
    return summary;
  } catch (error) {
    console.error('Failed to get production summary:', error);
    throw error;
  }
}

/**
 * Get revision history for dimension set
 */
export async function getRevisionHistory(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      return [];
    }
    
    const history = [];
    
    // Add current version
    history.push({
      version: dimensionSet.version_number || 1,
      id: dimensionSet.id,
      name: dimensionSet.name,
      state: dimensionSet.workflow_state,
      is_locked: dimensionSet.is_locked,
      created_date: dimensionSet.created_date
    });
    
    // Find parent versions
    let parentId = dimensionSet.parent_version_id;
    
    while (parentId) {
      const parent = await base44Client.entities.DimensionSet.filter({ 
        id: parentId 
      }).then(sets => sets[0]);
      
      if (!parent) break;
      
      history.push({
        version: parent.version_number || 1,
        id: parent.id,
        name: parent.name,
        state: parent.workflow_state,
        is_locked: parent.is_locked,
        created_date: parent.created_date
      });
      
      parentId = parent.parent_version_id;
    }
    
    // Sort by version descending
    history.sort((a, b) => b.version - a.version);
    
    return history;
  } catch (error) {
    console.error('Failed to get revision history:', error);
    return [];
  }
}