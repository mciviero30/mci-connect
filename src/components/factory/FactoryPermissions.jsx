/**
 * Factory Permissions
 * 
 * Enforces read-only access and data flow rules for Factory mode
 */

import { MODES } from './FactoryModeContext';

/**
 * Check if operation is allowed in Factory mode
 */
export function canPerformOperation(operation, mode, dimensionSet) {
  // Field mode has full CRUD
  if (mode === MODES.FIELD) {
    return true;
  }
  
  // Factory mode restrictions
  if (mode === MODES.FACTORY) {
    // Read operations always allowed
    if (operation === 'read' || operation === 'view') {
      return true;
    }
    
    // Write operations blocked by default
    if (['create', 'update', 'delete'].includes(operation)) {
      return false;
    }
    
    // Special: Can lock approved sets
    if (operation === 'lock' && dimensionSet?.workflow_state === 'approved') {
      return true;
    }
    
    // Special: Can create revision from locked set
    if (operation === 'create_revision' && dimensionSet?.is_locked) {
      return true;
    }
    
    return false;
  }
  
  return false;
}

/**
 * Validate Factory mode access to dimension set
 */
export function validateFactoryAccess(dimensionSet, mode) {
  if (mode === MODES.FIELD) {
    return { allowed: true };
  }
  
  // Factory can only view approved or locked sets
  if (!['approved', 'locked'].includes(dimensionSet.workflow_state)) {
    return {
      allowed: false,
      reason: 'Factory mode can only access approved or locked dimension sets'
    };
  }
  
  return { allowed: true };
}

/**
 * Prevent Field data mutation from Factory mode
 */
export function guardFieldDataMutation(mode) {
  if (mode === MODES.FACTORY) {
    throw new Error('Factory mode cannot mutate Field data directly. Create a revision instead.');
  }
}

/**
 * Check if dimension set is immutable in current mode
 */
export function isImmutableInMode(dimensionSet, mode) {
  // Locked sets are always immutable
  if (dimensionSet.is_locked) {
    return true;
  }
  
  // In Factory mode, all sets are immutable (read-only)
  if (mode === MODES.FACTORY) {
    return true;
  }
  
  return false;
}

/**
 * Get allowed operations for mode
 */
export function getAllowedOperations(mode, dimensionSet) {
  const operations = [];
  
  // Read always allowed
  operations.push('read', 'view', 'export');
  
  if (mode === MODES.FIELD) {
    // Field mode - full CRUD based on workflow state
    if (!dimensionSet.is_locked) {
      if (['draft', 'rejected'].includes(dimensionSet.workflow_state)) {
        operations.push('create', 'update', 'delete', 'submit');
      }
      
      if (dimensionSet.workflow_state === 'submitted') {
        operations.push('approve', 'reject');
      }
      
      if (dimensionSet.workflow_state === 'approved') {
        operations.push('lock');
      }
    }
  }
  
  if (mode === MODES.FACTORY) {
    // Factory mode - read-only + special actions
    if (dimensionSet.workflow_state === 'approved') {
      operations.push('lock');
    }
    
    if (dimensionSet.is_locked) {
      operations.push('create_revision');
    }
  }
  
  return operations;
}