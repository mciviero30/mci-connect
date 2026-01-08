/**
 * Factory Audit Logger
 * 
 * Logs all factory operations for accountability
 */

import { base44 } from '@/api/base44Client';

/**
 * Log factory action
 */
export async function logFactoryAction(action, data) {
  try {
    const user = await base44.auth.me();
    
    const logEntry = {
      action_type: action,
      performed_by: user.email,
      performed_by_name: user.full_name,
      performed_by_role: user.role,
      performed_at: new Date().toISOString(),
      dimension_set_id: data.dimension_set_id,
      job_id: data.job_id,
      details: data.details || {},
      ip_address: data.ip_address || null,
      user_agent: navigator.userAgent
    };
    
    // Log to ActivityFeed for compliance
    await base44.entities.ActivityFeed.create({
      entity_type: 'factory_action',
      entity_id: data.dimension_set_id,
      action: action,
      user_email: user.email,
      user_name: user.full_name,
      metadata: logEntry,
      description: formatActionDescription(action, data)
    });
    
    console.log('🏭 Factory Action Logged:', logEntry);
    
    return logEntry;
  } catch (error) {
    console.error('Failed to log factory action:', error);
    // Don't throw - logging failure shouldn't block operations
  }
}

/**
 * Format action description for activity feed
 */
function formatActionDescription(action, data) {
  switch (action) {
    case 'production_status_changed':
      return `Changed production status from ${data.from_status} to ${data.to_status}`;
    
    case 'factory_annotation_added':
      return `Added factory annotation to dimension`;
    
    case 'factory_annotation_updated':
      return `Updated factory annotation`;
    
    case 'production_pdf_exported':
      return `Exported production PDF (Rev ${data.revision})`;
    
    case 'validation_gate_checked':
      return `Validation gate checked: ${data.passed ? 'PASSED' : 'FAILED'}`;
    
    case 'comparison_viewed':
      return `Viewed comparison: Rev ${data.original_rev} vs Rev ${data.revised_rev}`;
    
    default:
      return `Factory action: ${action}`;
  }
}

/**
 * Get audit trail for dimension set
 */
export async function getFactoryAuditTrail(dimensionSetId) {
  try {
    const trail = await base44.entities.ActivityFeed.filter({
      entity_type: 'factory_action',
      entity_id: dimensionSetId
    }, '-created_date', 100);
    
    return trail;
  } catch (error) {
    console.error('Failed to get audit trail:', error);
    return [];
  }
}

/**
 * Get audit summary
 */
export async function getAuditSummary(dimensionSetId) {
  const trail = await getFactoryAuditTrail(dimensionSetId);
  
  const summary = {
    total_actions: trail.length,
    last_action: trail[0],
    unique_users: [...new Set(trail.map(t => t.user_email))],
    actions_by_type: {}
  };
  
  trail.forEach(entry => {
    summary.actions_by_type[entry.action] = 
      (summary.actions_by_type[entry.action] || 0) + 1;
  });
  
  return summary;
}