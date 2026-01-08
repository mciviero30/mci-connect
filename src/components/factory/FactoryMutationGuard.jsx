/**
 * Factory Mutation Guard
 * 
 * Prevents unauthorized mutations in Factory mode
 */

import { MODES } from './FactoryModeContext';
import { canPerformOperation, isImmutableInMode } from './FactoryPermissions';
import { enforceDataFlowRules } from './FactoryDataFlow';

/**
 * Mutation guard HOC for base44 client
 */
export function createGuardedClient(base44Client, mode) {
  // If Field mode, return unguarded client
  if (mode === MODES.FIELD) {
    return base44Client;
  }
  
  // Wrap Factory mode client with guards
  return {
    ...base44Client,
    entities: {
      ...base44Client.entities,
      
      // Guard DimensionSet mutations
      DimensionSet: {
        ...base44Client.entities.DimensionSet,
        
        create: async (...args) => {
          throw new Error('Factory mode cannot create dimension sets directly. Use createRevisionFromLocked() instead.');
        },
        
        update: async (id, data) => {
          // Only allow locking operation
          if (data.workflow_state === 'locked' && data.is_locked === true) {
            return base44Client.entities.DimensionSet.update(id, data);
          }
          
          throw new Error('Factory mode cannot update dimension sets. Read-only access only.');
        },
        
        delete: async (...args) => {
          throw new Error('Factory mode cannot delete dimension sets. Read-only access only.');
        },
        
        // Read operations pass through
        filter: base44Client.entities.DimensionSet.filter.bind(base44Client.entities.DimensionSet),
        list: base44Client.entities.DimensionSet.list.bind(base44Client.entities.DimensionSet)
      },
      
      // Guard FieldDimension mutations
      FieldDimension: {
        ...base44Client.entities.FieldDimension,
        
        create: async (...args) => {
          throw new Error('Factory mode cannot create dimensions directly. Create a revision instead.');
        },
        
        update: async (...args) => {
          throw new Error('Factory mode cannot update dimensions. Read-only access only.');
        },
        
        delete: async (...args) => {
          throw new Error('Factory mode cannot delete dimensions. Read-only access only.');
        },
        
        // Read operations pass through
        filter: base44Client.entities.FieldDimension.filter.bind(base44Client.entities.FieldDimension),
        list: base44Client.entities.FieldDimension.list.bind(base44Client.entities.FieldDimension)
      }
    }
  };
}

/**
 * Validate mutation before execution
 */
export function validateMutation(operation, entityType, data, mode, dimensionSet) {
  // Field mode - validate against workflow state
  if (mode === MODES.FIELD) {
    if (dimensionSet && isImmutableInMode(dimensionSet, mode)) {
      throw new Error('Cannot mutate locked dimension set in Field mode');
    }
    return true;
  }
  
  // Factory mode - enforce read-only except for special operations
  if (mode === MODES.FACTORY) {
    if (!canPerformOperation(operation, mode, dimensionSet)) {
      throw new Error(`Operation '${operation}' not allowed in Factory mode`);
    }
    
    enforceDataFlowRules(operation, dimensionSet, mode);
    return true;
  }
  
  return true;
}

/**
 * Mutation guard hook
 */
export function useMutationGuard(mode) {
  return {
    guardMutation: (operation, entityType, data, dimensionSet) => {
      return validateMutation(operation, entityType, data, mode, dimensionSet);
    },
    
    canMutate: (operation, dimensionSet) => {
      return canPerformOperation(operation, mode, dimensionSet);
    },
    
    isReadOnly: mode === MODES.FACTORY
  };
}