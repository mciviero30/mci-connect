/**
 * Factory Status Markers
 * 
 * Status indicators for Factory data consumption: Draft / Approved / Superseded
 */

/**
 * Data status types
 */
export const DATA_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  SUPERSEDED: 'superseded',
  LOCKED: 'locked'
};

/**
 * Get status for dimension set
 */
export function getDimensionSetStatus(dimensionSet, hasRevision = false) {
  // Superseded if a newer revision exists
  if (hasRevision) {
    return DATA_STATUS.SUPERSEDED;
  }
  
  // Locked = production-ready
  if (dimensionSet.is_locked) {
    return DATA_STATUS.LOCKED;
  }
  
  // Approved by supervisor
  if (dimensionSet.workflow_state === 'approved') {
    return DATA_STATUS.APPROVED;
  }
  
  // Draft (shouldn't be visible in Factory, but handle anyway)
  return DATA_STATUS.DRAFT;
}

/**
 * Get status badge data
 */
export function getStatusBadgeData(status) {
  const badges = {
    [DATA_STATUS.DRAFT]: {
      label: 'Draft',
      color: 'gray',
      description: 'In progress - not ready for production'
    },
    [DATA_STATUS.APPROVED]: {
      label: 'Approved',
      color: 'green',
      description: 'Supervisor approved - ready for production lock'
    },
    [DATA_STATUS.LOCKED]: {
      label: 'Production Ready',
      color: 'blue',
      description: 'Locked for production - immutable'
    },
    [DATA_STATUS.SUPERSEDED]: {
      label: 'Superseded',
      color: 'yellow',
      description: 'Replaced by newer revision - historical reference only'
    }
  };
  
  return badges[status] || badges[DATA_STATUS.DRAFT];
}

/**
 * Check if status allows Factory viewing
 */
export function canViewInFactory(status) {
  // Factory can only view approved, locked, or superseded data
  return [
    DATA_STATUS.APPROVED, 
    DATA_STATUS.LOCKED, 
    DATA_STATUS.SUPERSEDED
  ].includes(status);
}

/**
 * Check if status allows production use
 */
export function isProductionReady(status) {
  // Only locked data is production-ready
  return status === DATA_STATUS.LOCKED;
}

/**
 * Get status timeline
 */
export function getStatusTimeline(dimensionSet) {
  const timeline = [];
  
  // Parse state history
  const history = dimensionSet.state_history || [];
  
  history.forEach(entry => {
    if (entry.to_state === 'submitted') {
      timeline.push({
        status: 'Submitted',
        timestamp: entry.transitioned_at,
        user: entry.transitioned_by_name,
        notes: entry.notes
      });
    }
    
    if (entry.to_state === 'approved') {
      timeline.push({
        status: 'Approved',
        timestamp: entry.transitioned_at,
        user: entry.transitioned_by_name,
        notes: entry.notes
      });
    }
    
    if (entry.to_state === 'locked') {
      timeline.push({
        status: 'Locked for Production',
        timestamp: entry.transitioned_at,
        user: entry.transitioned_by_name,
        notes: entry.notes
      });
    }
    
    if (entry.to_state === 'rejected') {
      timeline.push({
        status: 'Rejected',
        timestamp: entry.transitioned_at,
        user: entry.transitioned_by_name,
        notes: entry.notes
      });
    }
  });
  
  return timeline;
}

/**
 * Get status warning messages
 */
export function getStatusWarnings(dimensionSet) {
  const warnings = [];
  
  if (dimensionSet.workflow_state === 'draft') {
    warnings.push('This data is in draft status and should not be visible in Factory mode');
  }
  
  if (dimensionSet.validation_flags?.requires_supervisor_review) {
    warnings.push('This set requires supervisor review before production use');
  }
  
  if (dimensionSet.validation_flags?.missing_benchmarks) {
    warnings.push('Missing benchmarks - verify measurements before production');
  }
  
  if (dimensionSet.validation_flags?.low_confidence_measurements) {
    warnings.push('Contains low confidence measurements - review accuracy');
  }
  
  return warnings;
}

/**
 * Check if dimension set can be edited
 */
export function isEditable(dimensionSet, mode) {
  // Never editable in Factory
  if (mode === 'factory') {
    return false;
  }
  
  // Not editable if locked
  if (dimensionSet.is_locked) {
    return false;
  }
  
  // Editable in draft or rejected state
  return ['draft', 'rejected'].includes(dimensionSet.workflow_state);
}

/**
 * Get data integrity status
 */
export function getDataIntegrityStatus(dimensionSet) {
  const status = {
    is_locked: dimensionSet.is_locked,
    is_immutable: dimensionSet.is_locked,
    has_approval: !!dimensionSet.approved_by,
    confidence_score: dimensionSet.approval_confidence_score,
    validation_passed: !dimensionSet.validation_flags?.incomplete_measurements,
    is_production_safe: dimensionSet.is_locked && dimensionSet.workflow_state === 'locked'
  };
  
  return status;
}