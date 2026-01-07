/**
 * Snapshot/Versioning Support for Field Dimensions
 * 
 * Tracks dimension sets through approval workflow:
 * draft → approved → superseded
 */

/**
 * Create dimension snapshot
 */
export function createDimensionSnapshot(dimensions, metadata) {
  const snapshot = {
    version_id: generateVersionId(),
    generated_at: new Date().toISOString(),
    generated_by: metadata.userId,
    generated_by_name: metadata.userName,
    status: 'draft',
    job_id: metadata.jobId,
    job_name: metadata.jobName,
    area: metadata.area || null,
    dimension_ids: dimensions.map(d => d.id),
    dimension_count: dimensions.length,
    units: metadata.units || 'imperial',
    includes_photos: metadata.includePhotos || false,
    includes_drawings: metadata.includeDrawings || false,
    notes: metadata.notes || '',
    snapshot_data: null // Will be populated by production prep
  };
  
  return snapshot;
}

/**
 * Generate unique version ID
 */
function generateVersionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `v${timestamp}-${random}`;
}

/**
 * Update snapshot status
 */
export function updateSnapshotStatus(snapshot, newStatus, userId, userName) {
  const validTransitions = {
    draft: ['approved', 'draft'],
    approved: ['superseded'],
    superseded: []
  };
  
  const allowedTransitions = validTransitions[snapshot.status] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${snapshot.status} → ${newStatus}`
    );
  }
  
  const updated = {
    ...snapshot,
    status: newStatus,
    status_updated_at: new Date().toISOString(),
    status_updated_by: userId,
    status_updated_by_name: userName
  };
  
  // Add approval metadata
  if (newStatus === 'approved') {
    updated.approved_at = updated.status_updated_at;
    updated.approved_by = userId;
    updated.approved_by_name = userName;
  }
  
  // Add superseded metadata
  if (newStatus === 'superseded') {
    updated.superseded_at = updated.status_updated_at;
    updated.superseded_by = userId;
    updated.superseded_by_name = userName;
  }
  
  return updated;
}

/**
 * Create new version from existing snapshot
 */
export function createSnapshotRevision(originalSnapshot, dimensions, metadata) {
  const revision = {
    ...createDimensionSnapshot(dimensions, metadata),
    parent_version_id: originalSnapshot.version_id,
    revision_number: (originalSnapshot.revision_number || 0) + 1,
    revision_reason: metadata.revisionReason || ''
  };
  
  return revision;
}

/**
 * Get snapshot history for a job/area
 */
export function getSnapshotHistory(snapshots, jobId, area = null) {
  let filtered = snapshots.filter(s => s.job_id === jobId);
  
  if (area) {
    filtered = filtered.filter(s => s.area === area);
  }
  
  // Sort by generated_at (newest first)
  return filtered.sort((a, b) => 
    new Date(b.generated_at) - new Date(a.generated_at)
  );
}

/**
 * Get active snapshot (most recent approved)
 */
export function getActiveSnapshot(snapshots, jobId, area = null) {
  const history = getSnapshotHistory(snapshots, jobId, area);
  return history.find(s => s.status === 'approved') || null;
}

/**
 * Get draft snapshots
 */
export function getDraftSnapshots(snapshots, jobId, area = null) {
  const history = getSnapshotHistory(snapshots, jobId, area);
  return history.filter(s => s.status === 'draft');
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(snapshotA, snapshotB) {
  const comparison = {
    version_diff: {
      from: snapshotA.version_id,
      to: snapshotB.version_id
    },
    dimension_count_diff: snapshotB.dimension_count - snapshotA.dimension_count,
    dimensions_added: [],
    dimensions_removed: [],
    dimensions_modified: []
  };
  
  const idsA = new Set(snapshotA.dimension_ids);
  const idsB = new Set(snapshotB.dimension_ids);
  
  // Find added dimensions
  comparison.dimensions_added = snapshotB.dimension_ids.filter(id => !idsA.has(id));
  
  // Find removed dimensions
  comparison.dimensions_removed = snapshotA.dimension_ids.filter(id => !idsB.has(id));
  
  // Find common dimensions (potential modifications)
  comparison.dimensions_common = snapshotA.dimension_ids.filter(id => idsB.has(id));
  
  return comparison;
}

/**
 * Supersede old snapshots when new one is approved
 */
export function supersedePreviousSnapshots(snapshots, newApprovedSnapshot, userId, userName) {
  return snapshots.map(snapshot => {
    // Only supersede approved snapshots for same job/area
    if (
      snapshot.status === 'approved' &&
      snapshot.job_id === newApprovedSnapshot.job_id &&
      snapshot.area === newApprovedSnapshot.area &&
      snapshot.version_id !== newApprovedSnapshot.version_id
    ) {
      return updateSnapshotStatus(snapshot, 'superseded', userId, userName);
    }
    return snapshot;
  });
}

/**
 * Validate snapshot data
 */
export function validateSnapshot(snapshot) {
  const errors = [];
  const warnings = [];
  
  if (!snapshot.version_id) {
    errors.push('Missing version_id');
  }
  
  if (!snapshot.generated_by) {
    errors.push('Missing generated_by');
  }
  
  if (!snapshot.job_id) {
    errors.push('Missing job_id');
  }
  
  if (!snapshot.dimension_ids || snapshot.dimension_ids.length === 0) {
    errors.push('No dimensions in snapshot');
  }
  
  if (snapshot.dimension_count !== snapshot.dimension_ids.length) {
    warnings.push('Dimension count mismatch with dimension_ids array');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}