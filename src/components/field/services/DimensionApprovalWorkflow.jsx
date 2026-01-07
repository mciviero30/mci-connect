/**
 * Approval & Sign-Off Workflow for Field Dimensions
 * 
 * State machine: draft → field_verified → supervisor_approved → production_approved → locked
 */

/**
 * Valid approval states
 */
export const APPROVAL_STATES = {
  DRAFT: 'draft',
  FIELD_VERIFIED: 'field_verified',
  SUPERVISOR_APPROVED: 'supervisor_approved',
  PRODUCTION_APPROVED: 'production_approved',
  LOCKED: 'locked'
};

/**
 * State transition rules
 */
const STATE_TRANSITIONS = {
  draft: ['field_verified', 'draft'],
  field_verified: ['supervisor_approved', 'draft'],
  supervisor_approved: ['production_approved', 'field_verified'],
  production_approved: ['locked', 'supervisor_approved'],
  locked: [] // No transitions - must create new version
};

/**
 * Required roles for each transition
 */
const REQUIRED_ROLES = {
  draft: ['field_tech', 'supervisor', 'admin'],
  field_verified: ['field_tech', 'supervisor', 'admin'],
  supervisor_approved: ['supervisor', 'admin'],
  production_approved: ['production', 'admin'],
  locked: ['admin']
};

/**
 * Check if user can perform action on dimension set
 */
export function canUserApprove(dimensionSet, user, targetState) {
  const currentState = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  
  // Check if transition is valid
  const allowedTransitions = STATE_TRANSITIONS[currentState] || [];
  if (!allowedTransitions.includes(targetState)) {
    return {
      allowed: false,
      reason: `Invalid transition: ${currentState} → ${targetState}`
    };
  }
  
  // Check if user has required role
  const requiredRoles = REQUIRED_ROLES[targetState] || [];
  const userRole = getUserRole(user);
  
  if (!requiredRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `User role '${userRole}' cannot approve to '${targetState}'. Required: ${requiredRoles.join(', ')}`
    };
  }
  
  // Check if locked
  if (currentState === APPROVAL_STATES.LOCKED) {
    return {
      allowed: false,
      reason: 'Dimension set is locked. Create new version to make changes.'
    };
  }
  
  return { allowed: true };
}

/**
 * Get user role for approval workflow
 */
function getUserRole(user) {
  // Map user roles/positions to workflow roles
  const position = (user?.position || '').toLowerCase();
  const role = (user?.role || '').toLowerCase();
  
  if (role === 'admin') return 'admin';
  
  if (position.includes('production') || position.includes('shop')) {
    return 'production';
  }
  
  if (position.includes('supervisor') || position.includes('manager')) {
    return 'supervisor';
  }
  
  if (position.includes('field') || position.includes('technician')) {
    return 'field_tech';
  }
  
  // Default to field tech
  return 'field_tech';
}

/**
 * Create approval record
 */
export function createApprovalRecord(dimensionSet, user, targetState, notes = '') {
  const userRole = getUserRole(user);
  
  return {
    dimension_set_id: dimensionSet.id,
    from_state: dimensionSet.approval_status || APPROVAL_STATES.DRAFT,
    to_state: targetState,
    approver_id: user.email,
    approver_name: user.full_name,
    approver_role: userRole,
    approved_at: new Date().toISOString(),
    approval_notes: notes,
    offline_synced: false // For offline support
  };
}

/**
 * Apply approval to dimension set
 */
export function applyApproval(dimensionSet, approvalRecord) {
  const updated = {
    ...dimensionSet,
    approval_status: approvalRecord.to_state,
    last_approval_at: approvalRecord.approved_at,
    last_approver_id: approvalRecord.approver_id,
    last_approver_name: approvalRecord.approver_name
  };
  
  // Track approval history in dimension set
  if (!updated.approval_history) {
    updated.approval_history = [];
  }
  
  updated.approval_history.push({
    state: approvalRecord.to_state,
    approver: approvalRecord.approver_name,
    role: approvalRecord.approver_role,
    at: approvalRecord.approved_at,
    notes: approvalRecord.approval_notes
  });
  
  // Add locked metadata
  if (approvalRecord.to_state === APPROVAL_STATES.LOCKED) {
    updated.locked_at = approvalRecord.approved_at;
    updated.locked_by = approvalRecord.approver_id;
    updated.locked_by_name = approvalRecord.approver_name;
  }
  
  return updated;
}

/**
 * Check if dimension set can be edited
 */
export function canEditDimensionSet(dimensionSet, user) {
  const approvalStatus = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  
  // Locked sets cannot be edited
  if (approvalStatus === APPROVAL_STATES.LOCKED) {
    return {
      allowed: false,
      reason: 'Dimension set is locked. Create new version to make changes.'
    };
  }
  
  // Admin can always edit (except locked)
  if (user?.role === 'admin') {
    return { allowed: true };
  }
  
  const userRole = getUserRole(user);
  
  // Field tech can edit draft and field_verified
  if (userRole === 'field_tech') {
    if ([APPROVAL_STATES.DRAFT, APPROVAL_STATES.FIELD_VERIFIED].includes(approvalStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Field tech cannot edit supervisor-approved or higher sets'
    };
  }
  
  // Supervisor can edit up to supervisor_approved
  if (userRole === 'supervisor') {
    if ([APPROVAL_STATES.DRAFT, APPROVAL_STATES.FIELD_VERIFIED, APPROVAL_STATES.SUPERVISOR_APPROVED].includes(approvalStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Supervisor cannot edit production-approved sets'
    };
  }
  
  // Production can edit production_approved (before lock)
  if (userRole === 'production') {
    if (approvalStatus === APPROVAL_STATES.PRODUCTION_APPROVED) {
      return { allowed: true };
    }
  }
  
  return {
    allowed: false,
    reason: 'Insufficient permissions to edit this dimension set'
  };
}

/**
 * Get next possible states for a dimension set
 */
export function getNextStates(dimensionSet, user) {
  const currentState = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  const allowedTransitions = STATE_TRANSITIONS[currentState] || [];
  
  return allowedTransitions.filter(targetState => {
    const check = canUserApprove(dimensionSet, user, targetState);
    return check.allowed;
  });
}

/**
 * Get approval workflow status display
 */
export function getApprovalStatusDisplay(approvalStatus) {
  const displays = {
    draft: { label: 'Draft', color: 'slate', icon: '📝' },
    field_verified: { label: 'Field Verified', color: 'blue', icon: '✓' },
    supervisor_approved: { label: 'Supervisor Approved', color: 'green', icon: '✓✓' },
    production_approved: { label: 'Production Approved', color: 'purple', icon: '✓✓✓' },
    locked: { label: 'Locked', color: 'red', icon: '🔒' }
  };
  
  return displays[approvalStatus] || displays.draft;
}

/**
 * Validate approval workflow
 */
export function validateApprovalWorkflow(dimensionSet, approvalRecord) {
  const errors = [];
  const warnings = [];
  
  // Check state transition validity
  const currentState = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  const allowedTransitions = STATE_TRANSITIONS[currentState] || [];
  
  if (!allowedTransitions.includes(approvalRecord.to_state)) {
    errors.push(`Invalid state transition: ${currentState} → ${approvalRecord.to_state}`);
  }
  
  // Check if dimension set has dimensions
  if (!dimensionSet.dimension_ids || dimensionSet.dimension_ids.length === 0) {
    errors.push('Cannot approve empty dimension set');
  }
  
  // Warn if approving without verification
  if (approvalRecord.to_state === APPROVAL_STATES.SUPERVISOR_APPROVED && 
      currentState === APPROVAL_STATES.DRAFT) {
    warnings.push('Approving without field verification');
  }
  
  return { valid: errors.length === 0, errors, warnings };
}