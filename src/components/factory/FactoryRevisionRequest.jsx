/**
 * Factory Revision Request System
 * 
 * Handles change requests from Factory that create Field revisions
 */

import { MODES } from './FactoryModeContext';

/**
 * Create revision request from Factory
 */
export async function createRevisionRequest(dimensionSetId, requestData, user, base44Client) {
  try {
    // Validate dimension set exists and is locked
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    if (!dimensionSet.is_locked) {
      throw new Error('Can only request revisions for locked sets');
    }
    
    // Validate request data
    if (!requestData.reason || requestData.reason.trim().length === 0) {
      throw new Error('Revision reason is required');
    }
    
    // Create revision request record
    const request = {
      dimension_set_id: dimensionSetId,
      dimension_set_name: dimensionSet.name,
      job_id: dimensionSet.job_id,
      requested_by: user.email,
      requested_by_name: user.full_name,
      requested_at: new Date().toISOString(),
      reason: requestData.reason,
      requested_changes: requestData.changes || [],
      status: 'pending',
      priority: requestData.priority || 'normal',
      notes: requestData.notes || ''
    };
    
    // Store in a RevisionRequest entity or as metadata
    // For now, we'll add it to the dimension set's notes
    await base44Client.entities.DimensionSet.update(dimensionSetId, {
      notes: `${dimensionSet.notes || ''}\n\n[REVISION REQUEST ${new Date().toISOString()}]\nRequested by: ${user.full_name}\nReason: ${requestData.reason}`
    });
    
    return {
      success: true,
      request,
      message: 'Revision request submitted. Field team will create a new revision.'
    };
  } catch (error) {
    console.error('Failed to create revision request:', error);
    throw error;
  }
}

/**
 * Create Field revision from Factory request (Field supervisor action)
 */
export async function createFieldRevisionFromRequest(requestId, dimensionSetId, user, base44Client) {
  try {
    // Validate user has Field supervisor permissions
    const position = (user.position || '').toLowerCase();
    const isSupervisor = position.includes('supervisor') || 
                        position.includes('manager') || 
                        user.role === 'admin';
    
    if (!isSupervisor) {
      throw new Error('Only Field supervisors can create revisions from requests');
    }
    
    // Fetch locked set
    const lockedSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!lockedSet || !lockedSet.is_locked) {
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
      
      newDim.status = 'draft';
      newDim.notes = `Revision requested from Factory - ID: ${requestId}`;
      
      const created = await base44Client.entities.FieldDimension.create(newDim);
      newDimensionIds.push(created.id);
    }
    
    // Create revision set
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
      notes: `Revision created from Factory request ID: ${requestId}`,
      state_history: [{
        from_state: 'locked',
        to_state: 'draft',
        transitioned_by: user.email,
        transitioned_by_name: user.full_name,
        transitioned_at: new Date().toISOString(),
        notes: `Created revision from Factory request: ${requestId}`
      }]
    });
    
    return {
      success: true,
      revision_id: revisionSet.id,
      version_number: nextVersion
    };
  } catch (error) {
    console.error('Failed to create Field revision:', error);
    throw error;
  }
}

/**
 * Validate revision request
 */
export function validateRevisionRequest(requestData) {
  const errors = [];
  
  if (!requestData.reason || requestData.reason.trim().length < 10) {
    errors.push('Revision reason must be at least 10 characters');
  }
  
  if (requestData.changes && requestData.changes.length === 0) {
    errors.push('At least one change must be specified');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get revision request status
 */
export function getRequestStatus(request) {
  if (!request) return 'unknown';
  
  if (request.status === 'completed') {
    return 'completed';
  }
  
  if (request.status === 'rejected') {
    return 'rejected';
  }
  
  if (request.status === 'in_progress') {
    return 'in_progress';
  }
  
  return 'pending';
}