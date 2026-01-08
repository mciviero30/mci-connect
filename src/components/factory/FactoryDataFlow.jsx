/**
 * Factory Data Flow
 * 
 * Controls data flow between Field and Factory modes
 */

import { MODES } from './FactoryModeContext';
import { guardFieldDataMutation } from './FactoryPermissions';

/**
 * Data flow states
 */
export const FLOW_STATES = {
  FIELD_DRAFT: 'field_draft',
  FIELD_SUBMITTED: 'field_submitted',
  FIELD_APPROVED: 'field_approved',
  FACTORY_LOCKED: 'factory_locked',
  FACTORY_REVISION: 'factory_revision'
};

/**
 * Get data flow state
 */
export function getDataFlowState(dimensionSet) {
  if (dimensionSet.is_locked) {
    return FLOW_STATES.FACTORY_LOCKED;
  }
  
  if (dimensionSet.workflow_state === 'approved') {
    return FLOW_STATES.FIELD_APPROVED;
  }
  
  if (dimensionSet.workflow_state === 'submitted') {
    return FLOW_STATES.FIELD_SUBMITTED;
  }
  
  if (dimensionSet.parent_version_id) {
    return FLOW_STATES.FACTORY_REVISION;
  }
  
  return FLOW_STATES.FIELD_DRAFT;
}

/**
 * Check if data can flow from Field to Factory
 */
export function canFlowToFactory(dimensionSet) {
  // Only approved or locked sets flow to Factory
  return ['approved', 'locked'].includes(dimensionSet.workflow_state);
}

/**
 * Check if data can flow from Factory to Field
 */
export function canFlowToField(dimensionSet) {
  // Only revisions flow back to Field
  return dimensionSet.parent_version_id !== undefined;
}

/**
 * Create revision from locked set (Factory → Field)
 */
export async function createRevisionFromLocked(dimensionSetId, revisionData, user, base44Client) {
  try {
    // Fetch locked set
    const lockedSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!lockedSet) {
      throw new Error('Dimension set not found');
    }
    
    if (!lockedSet.is_locked) {
      throw new Error('Can only create revisions from locked sets');
    }
    
    // Clone dimensions
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: lockedSet.dimension_ids }
    });
    
    const newDimensionIds = [];
    
    for (const dim of dimensions) {
      const newDim = { ...dim };
      delete newDim.id;
      delete newDim.created_date;
      delete newDim.updated_date;
      
      // Mark as revision
      newDim.status = 'draft';
      newDim.notes = `Revision of ${lockedSet.name} - ${revisionData.reason}`;
      
      const created = await base44Client.entities.FieldDimension.create(newDim);
      newDimensionIds.push(created.id);
    }
    
    // Create new version
    const nextVersion = (lockedSet.version_number || 1) + 1;
    
    const revisionSet = await base44Client.entities.DimensionSet.create({
      job_id: lockedSet.job_id,
      name: `${lockedSet.name} (Rev ${nextVersion})`,
      area: lockedSet.area,
      dimension_ids: newDimensionIds,
      workflow_state: 'draft',
      version_number: nextVersion,
      parent_version_id: lockedSet.id,
      captured_by: user.email,
      captured_by_name: user.full_name,
      capture_date: new Date().toISOString().split('T')[0],
      notes: `Revision: ${revisionData.reason}`,
      state_history: [{
        from_state: 'locked',
        to_state: 'draft',
        transitioned_by: user.email,
        transitioned_by_name: user.full_name,
        transitioned_at: new Date().toISOString(),
        notes: `Created revision from locked set: ${revisionData.reason}`
      }]
    });
    
    return {
      success: true,
      revision_id: revisionSet.id,
      version_number: nextVersion
    };
    
  } catch (error) {
    console.error('Failed to create revision:', error);
    throw error;
  }
}

/**
 * Enforce data flow rules on mutation
 */
export function enforceDataFlowRules(operation, dimensionSet, mode) {
  // Guard against Factory mutations
  if (mode === MODES.FACTORY && ['create', 'update', 'delete'].includes(operation)) {
    guardFieldDataMutation(mode);
  }
  
  // Guard against Field mutations of locked sets
  if (mode === MODES.FIELD && dimensionSet.is_locked) {
    throw new Error('Cannot mutate locked dimension set. Create a revision instead.');
  }
  
  return true;
}

/**
 * Get data flow metadata
 */
export function getDataFlowMetadata(dimensionSet) {
  return {
    flow_state: getDataFlowState(dimensionSet),
    can_flow_to_factory: canFlowToFactory(dimensionSet),
    can_flow_to_field: canFlowToField(dimensionSet),
    is_revision: !!dimensionSet.parent_version_id,
    is_locked: dimensionSet.is_locked,
    version_number: dimensionSet.version_number || 1,
    parent_version_id: dimensionSet.parent_version_id
  };
}