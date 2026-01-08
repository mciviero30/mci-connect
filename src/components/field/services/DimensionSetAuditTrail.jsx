/**
 * Dimension Set Audit Trail
 * 
 * Captures and tracks all dimension set state changes
 */

/**
 * Create audit log entry
 */
export async function logStateTransition(dimensionSetId, transition, base44Client) {
  try {
    // Audit log can be stored as ActivityFeed or separate AuditLog entity
    await base44Client.entities.ActivityFeed.create({
      entity_type: 'DimensionSet',
      entity_id: dimensionSetId,
      action: 'state_transition',
      action_data: {
        from_state: transition.from_state,
        to_state: transition.to_state,
        transitioned_by: transition.transitioned_by,
        transitioned_by_name: transition.transitioned_by_name,
        notes: transition.notes
      },
      user_email: transition.transitioned_by,
      user_name: transition.transitioned_by_name
    });
  } catch (error) {
    console.error('Failed to log state transition:', error);
  }
}

/**
 * Get audit history for dimension set
 */
export async function getAuditHistory(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      return [];
    }
    
    return dimensionSet.state_history || [];
  } catch (error) {
    console.error('Failed to get audit history:', error);
    return [];
  }
}

/**
 * Generate audit report
 */
export function generateAuditReport(dimensionSet) {
  const report = {
    dimension_set_id: dimensionSet.id,
    dimension_set_name: dimensionSet.name,
    current_state: dimensionSet.workflow_state,
    is_locked: dimensionSet.is_locked,
    timeline: []
  };
  
  const history = dimensionSet.state_history || [];
  
  history.forEach(entry => {
    report.timeline.push({
      timestamp: entry.transitioned_at,
      action: `${entry.from_state} → ${entry.to_state}`,
      user: entry.transitioned_by_name || entry.transitioned_by,
      notes: entry.notes
    });
  });
  
  // Add metadata
  if (dimensionSet.submitted_at) {
    report.submitted_at = dimensionSet.submitted_at;
    report.submitted_by = dimensionSet.submitted_by_name || dimensionSet.submitted_by;
  }
  
  if (dimensionSet.approved_at) {
    report.approved_at = dimensionSet.approved_at;
    report.approved_by = dimensionSet.approved_by_name || dimensionSet.approved_by;
    report.approval_notes = dimensionSet.approval_notes;
    report.approval_confidence = dimensionSet.approval_confidence_score;
  }
  
  if (dimensionSet.locked_at) {
    report.locked_at = dimensionSet.locked_at;
    report.locked_by = dimensionSet.locked_by_name || dimensionSet.locked_by;
  }
  
  if (dimensionSet.rejected_at) {
    report.rejected_at = dimensionSet.rejected_at;
    report.rejected_by = dimensionSet.rejected_by_name || dimensionSet.rejected_by;
    report.rejection_reason = dimensionSet.rejection_reason;
  }
  
  return report;
}