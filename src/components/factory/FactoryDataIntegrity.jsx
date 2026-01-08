/**
 * Factory Data Integrity
 * 
 * Ensures data integrity between Field and Factory modes
 */

import { MODES } from './FactoryModeContext';
import { DATA_STATUS } from './FactoryStatusMarkers';

/**
 * Validate data integrity before Factory access
 */
export async function validateDataIntegrity(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      return {
        valid: false,
        errors: ['Dimension set not found']
      };
    }
    
    const errors = [];
    const warnings = [];
    
    // Check workflow state
    if (!['approved', 'locked'].includes(dimensionSet.workflow_state)) {
      errors.push('Dimension set must be approved or locked for Factory access');
    }
    
    // Check dimensions exist
    if (!dimensionSet.dimension_ids || dimensionSet.dimension_ids.length === 0) {
      errors.push('Dimension set contains no measurements');
    }
    
    // Check validation flags
    if (dimensionSet.validation_flags?.incomplete_measurements) {
      errors.push('Dimension set contains incomplete measurements');
    }
    
    if (dimensionSet.validation_flags?.missing_benchmarks) {
      warnings.push('Missing benchmarks detected');
    }
    
    if (dimensionSet.validation_flags?.low_confidence_measurements) {
      warnings.push('Low confidence measurements detected');
    }
    
    // Check approval metadata
    if (!dimensionSet.approved_by || !dimensionSet.approved_at) {
      warnings.push('Missing approval metadata');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      integrity_score: calculateIntegrityScore(dimensionSet, errors, warnings)
    };
  } catch (error) {
    console.error('Failed to validate data integrity:', error);
    return {
      valid: false,
      errors: ['Validation failed: ' + error.message]
    };
  }
}

/**
 * Calculate integrity score (0-100)
 */
function calculateIntegrityScore(dimensionSet, errors, warnings) {
  let score = 100;
  
  // Deduct for errors
  score -= errors.length * 25;
  
  // Deduct for warnings
  score -= warnings.length * 10;
  
  // Bonus for locked status
  if (dimensionSet.is_locked) {
    score += 10;
  }
  
  // Bonus for high confidence
  if (dimensionSet.approval_confidence_score >= 0.9) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Verify immutability before Factory consumption
 */
export function verifyImmutability(dimensionSet) {
  const checks = {
    is_locked: dimensionSet.is_locked === true,
    has_lock_metadata: !!(dimensionSet.locked_by && dimensionSet.locked_at),
    workflow_locked: dimensionSet.workflow_state === 'locked',
    is_immutable: false
  };
  
  checks.is_immutable = checks.is_locked && checks.has_lock_metadata && checks.workflow_locked;
  
  return checks;
}

/**
 * Audit data access
 */
export async function auditFactoryAccess(dimensionSetId, user, action, base44Client) {
  try {
    // Log access for compliance
    await base44Client.entities.ActivityFeed.create({
      entity_type: 'DimensionSet',
      entity_id: dimensionSetId,
      action: `factory_${action}`,
      action_data: {
        mode: MODES.FACTORY,
        timestamp: new Date().toISOString()
      },
      user_email: user.email,
      user_name: user.full_name
    });
  } catch (error) {
    console.error('Failed to audit Factory access:', error);
  }
}

/**
 * Check for data conflicts
 */
export async function checkDataConflicts(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      return { has_conflicts: false, conflicts: [] };
    }
    
    const conflicts = [];
    
    // Check for multiple revisions
    const revisions = await base44Client.entities.DimensionSet.filter({
      parent_version_id: dimensionSetId
    });
    
    if (revisions.length > 0) {
      conflicts.push({
        type: 'revision',
        message: `${revisions.length} newer revision(s) exist`,
        severity: 'info'
      });
    }
    
    // Check for pending revision requests
    const pendingRequests = dimensionSet.notes?.includes('[REVISION REQUEST') || false;
    
    if (pendingRequests) {
      conflicts.push({
        type: 'pending_request',
        message: 'Pending revision request exists',
        severity: 'warning'
      });
    }
    
    return {
      has_conflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Failed to check conflicts:', error);
    return { has_conflicts: false, conflicts: [] };
  }
}

/**
 * Generate data integrity report
 */
export async function generateIntegrityReport(dimensionSetId, base44Client) {
  try {
    const [validation, conflicts, dimensionSet] = await Promise.all([
      validateDataIntegrity(dimensionSetId, base44Client),
      checkDataConflicts(dimensionSetId, base44Client),
      base44Client.entities.DimensionSet.filter({ id: dimensionSetId }).then(sets => sets[0])
    ]);
    
    const immutability = verifyImmutability(dimensionSet);
    
    return {
      dimension_set_id: dimensionSetId,
      dimension_set_name: dimensionSet?.name,
      integrity_score: validation.integrity_score,
      is_valid: validation.valid,
      is_immutable: immutability.is_immutable,
      has_conflicts: conflicts.has_conflicts,
      errors: validation.errors,
      warnings: validation.warnings,
      conflicts: conflicts.conflicts,
      immutability_checks: immutability,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to generate integrity report:', error);
    throw error;
  }
}