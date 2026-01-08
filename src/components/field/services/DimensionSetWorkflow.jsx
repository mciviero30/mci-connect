/**
 * Dimension Set Workflow
 * 
 * Manages state transitions and production lock for dimension sets
 */

import { checkPermission } from './DimensionSetPermissions';
import { validateForSubmission, validateForApproval } from './DimensionSetValidation';

/**
 * Workflow states
 */
export const WORKFLOW_STATES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  LOCKED: 'locked',
  REJECTED: 'rejected'
};

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.DRAFT]: [WORKFLOW_STATES.SUBMITTED],
  [WORKFLOW_STATES.SUBMITTED]: [WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.APPROVED]: [WORKFLOW_STATES.LOCKED],
  [WORKFLOW_STATES.REJECTED]: [WORKFLOW_STATES.SUBMITTED],
  [WORKFLOW_STATES.LOCKED]: [] // No transitions from locked
};

/**
 * Submit dimension set for approval
 */
export async function submitForApproval(dimensionSetId, user, base44Client) {
  try {
    // Fetch dimension set
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Check if locked
    if (dimensionSet.is_locked) {
      throw new Error('Cannot modify locked dimension set');
    }
    
    // Check current state
    if (dimensionSet.workflow_state !== WORKFLOW_STATES.DRAFT && 
        dimensionSet.workflow_state !== WORKFLOW_STATES.REJECTED) {
      throw new Error(`Cannot submit from state: ${dimensionSet.workflow_state}`);
    }
    
    // Validate for submission
    const validation = await validateForSubmission(dimensionSet, base44Client);
    
    if (!validation.canSubmit) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Update state
    const stateHistory = dimensionSet.state_history || [];
    stateHistory.push({
      from_state: dimensionSet.workflow_state,
      to_state: WORKFLOW_STATES.SUBMITTED,
      transitioned_by: user.email,
      transitioned_by_name: user.full_name,
      transitioned_at: new Date().toISOString(),
      notes: 'Submitted for supervisor review'
    });
    
    await base44Client.entities.DimensionSet.update(dimensionSetId, {
      workflow_state: WORKFLOW_STATES.SUBMITTED,
      submitted_at: new Date().toISOString(),
      submitted_by: user.email,
      submitted_by_name: user.full_name,
      state_history: stateHistory,
      validation_flags: validation.flags
    });
    
    return {
      success: true,
      new_state: WORKFLOW_STATES.SUBMITTED
    };
    
  } catch (error) {
    console.error('Failed to submit dimension set:', error);
    throw error;
  }
}

/**
 * Approve dimension set (supervisor only)
 */
export async function approveDimensionSet(dimensionSetId, approvalData, user, base44Client) {
  try {
    // Check permission
    if (!checkPermission(user, 'approve')) {
      throw new Error('Only supervisors can approve dimension sets');
    }
    
    // Validate mandatory notes
    if (!approvalData.notes || approvalData.notes.trim().length === 0) {
      throw new Error('Approval notes are mandatory');
    }
    
    // Fetch dimension set
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Check if locked
    if (dimensionSet.is_locked) {
      throw new Error('Cannot modify locked dimension set');
    }
    
    // Check current state
    if (dimensionSet.workflow_state !== WORKFLOW_STATES.SUBMITTED) {
      throw new Error(`Cannot approve from state: ${dimensionSet.workflow_state}`);
    }
    
    // Validate for approval
    const validation = await validateForApproval(dimensionSet, base44Client);
    
    if (!validation.canApprove) {
      throw new Error(`Approval validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Calculate average confidence score
    const dimensions = await base44Client.entities.FieldDimension.filter({ 
      id: { $in: dimensionSet.dimension_ids } 
    });
    
    const avgConfidence = dimensions.reduce((sum, d) => sum + (d.confidence_score || 0.5), 0) / dimensions.length;
    
    // Update state
    const stateHistory = dimensionSet.state_history || [];
    stateHistory.push({
      from_state: dimensionSet.workflow_state,
      to_state: WORKFLOW_STATES.APPROVED,
      transitioned_by: user.email,
      transitioned_by_name: user.full_name,
      transitioned_at: new Date().toISOString(),
      notes: approvalData.notes
    });
    
    await base44Client.entities.DimensionSet.update(dimensionSetId, {
      workflow_state: WORKFLOW_STATES.APPROVED,
      approved_at: new Date().toISOString(),
      approved_by: user.email,
      approved_by_name: user.full_name,
      approval_notes: approvalData.notes,
      approval_confidence_score: avgConfidence,
      state_history: stateHistory
    });
    
    return {
      success: true,
      new_state: WORKFLOW_STATES.APPROVED,
      confidence_score: avgConfidence
    };
    
  } catch (error) {
    console.error('Failed to approve dimension set:', error);
    throw error;
  }
}

/**
 * Reject dimension set (supervisor only)
 */
export async function rejectDimensionSet(dimensionSetId, rejectionData, user, base44Client) {
  try {
    // Check permission
    if (!checkPermission(user, 'reject')) {
      throw new Error('Only supervisors can reject dimension sets');
    }
    
    // Validate mandatory reason
    if (!rejectionData.reason || rejectionData.reason.trim().length === 0) {
      throw new Error('Rejection reason is mandatory');
    }
    
    // Fetch dimension set
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Check if locked
    if (dimensionSet.is_locked) {
      throw new Error('Cannot modify locked dimension set');
    }
    
    // Check current state
    if (dimensionSet.workflow_state !== WORKFLOW_STATES.SUBMITTED) {
      throw new Error(`Cannot reject from state: ${dimensionSet.workflow_state}`);
    }
    
    // Update state
    const stateHistory = dimensionSet.state_history || [];
    stateHistory.push({
      from_state: dimensionSet.workflow_state,
      to_state: WORKFLOW_STATES.REJECTED,
      transitioned_by: user.email,
      transitioned_by_name: user.full_name,
      transitioned_at: new Date().toISOString(),
      notes: rejectionData.reason
    });
    
    await base44Client.entities.DimensionSet.update(dimensionSetId, {
      workflow_state: WORKFLOW_STATES.REJECTED,
      rejected_at: new Date().toISOString(),
      rejected_by: user.email,
      rejected_by_name: user.full_name,
      rejection_reason: rejectionData.reason,
      state_history: stateHistory
    });
    
    return {
      success: true,
      new_state: WORKFLOW_STATES.REJECTED
    };
    
  } catch (error) {
    console.error('Failed to reject dimension set:', error);
    throw error;
  }
}

/**
 * Lock dimension set for production (production role only)
 */
export async function lockForProduction(dimensionSetId, user, base44Client) {
  try {
    // Check permission
    if (!checkPermission(user, 'lock')) {
      throw new Error('Only production team can lock dimension sets');
    }
    
    // Fetch dimension set
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Check if already locked
    if (dimensionSet.is_locked) {
      throw new Error('Dimension set is already locked');
    }
    
    // Check current state
    if (dimensionSet.workflow_state !== WORKFLOW_STATES.APPROVED) {
      throw new Error(`Can only lock approved sets. Current state: ${dimensionSet.workflow_state}`);
    }
    
    // Update state (immutable from this point)
    const stateHistory = dimensionSet.state_history || [];
    stateHistory.push({
      from_state: dimensionSet.workflow_state,
      to_state: WORKFLOW_STATES.LOCKED,
      transitioned_by: user.email,
      transitioned_by_name: user.full_name,
      transitioned_at: new Date().toISOString(),
      notes: 'Locked for production - immutable'
    });
    
    await base44Client.entities.DimensionSet.update(dimensionSetId, {
      workflow_state: WORKFLOW_STATES.LOCKED,
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: user.email,
      locked_by_name: user.full_name,
      state_history: stateHistory
    });
    
    return {
      success: true,
      new_state: WORKFLOW_STATES.LOCKED
    };
    
  } catch (error) {
    console.error('Failed to lock dimension set:', error);
    throw error;
  }
}

/**
 * Prevent modification of locked sets
 */
export async function enforceImmutability(dimensionSetId, base44Client) {
  const dimensionSet = await base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0]);
  
  if (dimensionSet && dimensionSet.is_locked) {
    throw new Error('Cannot modify locked dimension set. Locked sets are immutable for production integrity.');
  }
  
  return true;
}

/**
 * Check if state transition is valid
 */
export function canTransition(currentState, targetState) {
  const validTargets = VALID_TRANSITIONS[currentState] || [];
  return validTargets.includes(targetState);
}