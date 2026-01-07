/**
 * Versioning Support for Dimension Sets
 * 
 * When a locked set needs changes, create a new version with full audit trail
 */

import { APPROVAL_STATES } from './DimensionApprovalWorkflow';

/**
 * Check if dimension set requires new version
 */
export function requiresNewVersion(dimensionSet) {
  const approvalStatus = dimensionSet.approval_status || APPROVAL_STATES.DRAFT;
  return approvalStatus === APPROVAL_STATES.LOCKED;
}

/**
 * Create new version from locked dimension set
 */
export function createNewVersion(lockedDimensionSet, user, reason = '') {
  if (lockedDimensionSet.approval_status !== APPROVAL_STATES.LOCKED) {
    throw new Error('Can only create version from locked dimension set');
  }
  
  const newVersion = {
    // New metadata
    job_id: lockedDimensionSet.job_id,
    name: `${lockedDimensionSet.name} (Rev ${(lockedDimensionSet.version_number || 1) + 1})`,
    area: lockedDimensionSet.area,
    
    // Copy dimension references (will be cloned separately)
    dimension_ids: [...(lockedDimensionSet.dimension_ids || [])],
    
    // Reset approval status
    approval_status: APPROVAL_STATES.DRAFT,
    approval_history: [],
    
    // Versioning metadata
    version_number: (lockedDimensionSet.version_number || 1) + 1,
    parent_version_id: lockedDimensionSet.id,
    parent_version_number: lockedDimensionSet.version_number || 1,
    revision_reason: reason,
    
    // Creation metadata
    captured_by: user.email,
    captured_by_name: user.full_name,
    capture_date: new Date().toISOString().split('T')[0],
    
    // Reset production fields
    production_submitted: false,
    production_submitted_date: null,
    reviewed_by: null,
    reviewed_date: null,
    
    // Notes
    notes: `Revision of ${lockedDimensionSet.name}. Reason: ${reason}`
  };
  
  return newVersion;
}

/**
 * Get version history for a dimension set
 */
export function getVersionHistory(dimensionSets, baseSetId) {
  const versions = [];
  
  // Find the root (oldest) version
  let current = dimensionSets.find(ds => ds.id === baseSetId);
  
  // Trace back to root
  while (current && current.parent_version_id) {
    current = dimensionSets.find(ds => ds.id === current.parent_version_id);
  }
  
  // Now traverse forward
  if (current) {
    versions.push(current);
    
    let nextVersions = dimensionSets.filter(ds => ds.parent_version_id === current.id);
    
    while (nextVersions.length > 0) {
      // Sort by version number
      nextVersions.sort((a, b) => (a.version_number || 0) - (b.version_number || 0));
      
      nextVersions.forEach(v => versions.push(v));
      
      // Find children of these versions
      const childIds = nextVersions.map(v => v.id);
      nextVersions = dimensionSets.filter(ds => 
        ds.parent_version_id && childIds.includes(ds.parent_version_id)
      );
    }
  }
  
  return versions;
}

/**
 * Get active (latest locked or approved) version
 */
export function getActiveVersion(dimensionSets, jobId, area) {
  const relevant = dimensionSets.filter(ds => 
    ds.job_id === jobId && 
    ds.area === area
  );
  
  // Prefer locked versions
  const locked = relevant
    .filter(ds => ds.approval_status === APPROVAL_STATES.LOCKED)
    .sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
  
  if (locked.length > 0) return locked[0];
  
  // Then production approved
  const prodApproved = relevant
    .filter(ds => ds.approval_status === APPROVAL_STATES.PRODUCTION_APPROVED)
    .sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
  
  if (prodApproved.length > 0) return prodApproved[0];
  
  // Then supervisor approved
  const supApproved = relevant
    .filter(ds => ds.approval_status === APPROVAL_STATES.SUPERVISOR_APPROVED)
    .sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
  
  if (supApproved.length > 0) return supApproved[0];
  
  // Otherwise latest version
  return relevant.sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0];
}

/**
 * Compare two versions
 */
export function compareVersions(versionA, versionB) {
  return {
    version_diff: (versionB.version_number || 0) - (versionA.version_number || 0),
    dimension_count_diff: (versionB.dimension_ids?.length || 0) - (versionA.dimension_ids?.length || 0),
    approval_status_diff: {
      from: versionA.approval_status,
      to: versionB.approval_status
    },
    created_at_diff: new Date(versionB.capture_date) - new Date(versionA.capture_date),
    revision_reason: versionB.revision_reason
  };
}

/**
 * Build audit trail for dimension set
 */
export function buildAuditTrail(dimensionSet) {
  const trail = [];
  
  // Creation event
  trail.push({
    event: 'created',
    timestamp: dimensionSet.capture_date,
    user: dimensionSet.captured_by_name || dimensionSet.captured_by,
    details: `Created dimension set: ${dimensionSet.name}`
  });
  
  // Approval events
  if (dimensionSet.approval_history && dimensionSet.approval_history.length > 0) {
    dimensionSet.approval_history.forEach(approval => {
      trail.push({
        event: 'approval',
        timestamp: approval.at,
        user: approval.approver,
        role: approval.role,
        state: approval.state,
        details: `Approved to ${approval.state}${approval.notes ? ': ' + approval.notes : ''}`
      });
    });
  }
  
  // Review event
  if (dimensionSet.reviewed_date) {
    trail.push({
      event: 'reviewed',
      timestamp: dimensionSet.reviewed_date,
      user: dimensionSet.reviewed_by,
      details: 'Dimension set reviewed'
    });
  }
  
  // Production submission
  if (dimensionSet.production_submitted_date) {
    trail.push({
      event: 'production_submitted',
      timestamp: dimensionSet.production_submitted_date,
      details: 'Submitted to production'
    });
  }
  
  // Locked event
  if (dimensionSet.locked_at) {
    trail.push({
      event: 'locked',
      timestamp: dimensionSet.locked_at,
      user: dimensionSet.locked_by_name || dimensionSet.locked_by,
      details: 'Dimension set locked'
    });
  }
  
  // Sort by timestamp
  return trail.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Get version summary
 */
export function getVersionSummary(dimensionSet) {
  return {
    version_id: dimensionSet.id,
    version_number: dimensionSet.version_number || 1,
    parent_version_id: dimensionSet.parent_version_id,
    approval_status: dimensionSet.approval_status || APPROVAL_STATES.DRAFT,
    is_locked: dimensionSet.approval_status === APPROVAL_STATES.LOCKED,
    dimension_count: dimensionSet.dimension_ids?.length || 0,
    created_at: dimensionSet.capture_date,
    created_by: dimensionSet.captured_by_name || dimensionSet.captured_by,
    locked_at: dimensionSet.locked_at,
    locked_by: dimensionSet.locked_by_name || dimensionSet.locked_by,
    revision_reason: dimensionSet.revision_reason
  };
}