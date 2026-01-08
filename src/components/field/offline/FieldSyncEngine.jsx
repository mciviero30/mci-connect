/**
 * Field Sync Engine
 * 
 * Batched synchronization with conflict resolution
 */

import { getPendingOperations, markOperationComplete, markOperationFailed } from './FieldOperationQueue';
import { getUnsyncedEntities, markAsSynced, updateEntityVersion } from './FieldOfflineStorage';
import { resolveConflict } from './FieldConflictResolver';

/**
 * Sync status
 */
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error'
};

let currentSyncStatus = SYNC_STATUS.IDLE;
let syncListeners = [];

/**
 * Start sync process
 */
export async function startSync(base44Client, user) {
  if (currentSyncStatus === SYNC_STATUS.SYNCING) {
    console.log('Sync already in progress');
    return { skipped: true };
  }
  
  try {
    updateSyncStatus(SYNC_STATUS.SYNCING);
    
    // Get pending operations
    const operations = await getPendingOperations();
    
    if (operations.length === 0) {
      updateSyncStatus(SYNC_STATUS.IDLE);
      return { success: true, synced: 0 };
    }
    
    console.log(`Starting sync: ${operations.length} operations`);
    
    // Batch operations by entity type
    const batches = batchOperations(operations);
    
    const results = {
      success: [],
      failed: [],
      conflicts: []
    };
    
    // Process batches
    for (const batch of batches) {
      const batchResult = await processBatch(batch, base44Client, user);
      results.success.push(...batchResult.success);
      results.failed.push(...batchResult.failed);
      results.conflicts.push(...batchResult.conflicts);
    }
    
    updateSyncStatus(SYNC_STATUS.IDLE);
    
    return {
      success: true,
      synced: results.success.length,
      failed: results.failed.length,
      conflicts: results.conflicts.length,
      results
    };
    
  } catch (error) {
    console.error('Sync failed:', error);
    updateSyncStatus(SYNC_STATUS.ERROR);
    throw error;
  }
}

/**
 * Batch operations by entity type
 */
function batchOperations(operations) {
  const batches = [];
  const byType = {};
  
  operations.forEach(op => {
    const key = `${op.entity_type}_${op.operation_type}`;
    if (!byType[key]) {
      byType[key] = [];
    }
    byType[key].push(op);
  });
  
  Object.values(byType).forEach(ops => {
    // Split into chunks of 50
    for (let i = 0; i < ops.length; i += 50) {
      batches.push(ops.slice(i, i + 50));
    }
  });
  
  return batches;
}

/**
 * Process batch of operations
 */
async function processBatch(operations, base44Client, user) {
  const results = {
    success: [],
    failed: [],
    conflicts: []
  };
  
  for (const operation of operations) {
    try {
      const result = await syncOperation(operation, base44Client, user);
      
      if (result.conflict) {
        results.conflicts.push({
          operation_id: operation.operation_id,
          local_id: operation.local_id,
          conflict: result.conflict
        });
      } else {
        results.success.push({
          operation_id: operation.operation_id,
          local_id: operation.local_id,
          server_id: result.server_id
        });
      }
      
    } catch (error) {
      console.error('Operation sync failed:', error);
      
      await markOperationFailed(operation.operation_id, error.message);
      
      results.failed.push({
        operation_id: operation.operation_id,
        local_id: operation.local_id,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Sync single operation
 */
async function syncOperation(operation, base44Client, user) {
  const { entity_type, operation_type, entity_data, local_id } = operation;
  
  // Map to entity name
  const entityName = mapEntityType(entity_type);
  
  try {
    if (operation_type === 'create') {
      // Check for conflicts
      const conflict = await checkCreateConflict(entityName, entity_data, base44Client);
      
      if (conflict) {
        const resolution = await resolveConflict(conflict, entity_data, user);
        
        if (resolution.action === 'skip') {
          await markOperationComplete(operation.operation_id, resolution.server_id);
          return { conflict: resolution, server_id: resolution.server_id };
        }
        
        // Use resolved data
        entity_data = resolution.resolved_data;
      }
      
      // Create on server
      const cleanData = prepareForServer(entity_data);
      const created = await base44Client.entities[entityName].create(cleanData);
      
      // Mark as synced
      await markOperationComplete(operation.operation_id, created.id);
      await markAsSynced(entity_type, local_id, created.id);
      
      return { server_id: created.id };
    }
    
    if (operation_type === 'update') {
      // Check if entity exists
      const serverId = entity_data.server_id;
      
      if (!serverId) {
        throw new Error('Cannot update: no server ID');
      }
      
      // Check for conflicts
      const serverVersion = await base44Client.entities[entityName].filter({ id: serverId }).then(r => r[0]);
      
      if (serverVersion && serverVersion.version > entity_data.version) {
        const resolution = await resolveConflict(
          { type: 'version_conflict', server: serverVersion, local: entity_data },
          entity_data,
          user
        );
        
        if (resolution.action === 'skip') {
          await markOperationComplete(operation.operation_id, serverId);
          return { conflict: resolution, server_id: serverId };
        }
        
        entity_data = resolution.resolved_data;
      }
      
      // Update on server
      const cleanData = prepareForServer(entity_data);
      await base44Client.entities[entityName].update(serverId, cleanData);
      
      // Update version
      await updateEntityVersion(entity_type, local_id, (entity_data.version || 1) + 1);
      await markOperationComplete(operation.operation_id, serverId);
      
      return { server_id: serverId };
    }
    
    if (operation_type === 'delete') {
      const serverId = entity_data.server_id;
      
      if (serverId) {
        await base44Client.entities[entityName].delete(serverId);
      }
      
      await markOperationComplete(operation.operation_id, serverId);
      
      return { server_id: serverId };
    }
    
  } catch (error) {
    console.error(`Failed to sync ${operation_type} for ${entity_type}:`, error);
    throw error;
  }
}

/**
 * Check for create conflicts
 */
async function checkCreateConflict(entityName, entityData, base44Client) {
  // Check if similar entity exists on server
  if (entityName === 'FieldDimension') {
    const existing = await base44Client.entities.FieldDimension.filter({
      job_id: entityData.job_id,
      area: entityData.area,
      measurement_type: entityData.measurement_type
    }, '', 10);
    
    // Check for very similar dimensions
    for (const e of existing) {
      const totalInches1 = (entityData.value_feet || 0) * 12 + (entityData.value_inches || 0);
      const totalInches2 = (e.value_feet || 0) * 12 + (e.value_inches || 0);
      
      if (Math.abs(totalInches1 - totalInches2) <= 1) {
        return {
          type: 'duplicate',
          server: e,
          local: entityData
        };
      }
    }
  }
  
  return null;
}

/**
 * Prepare entity data for server
 */
function prepareForServer(entityData) {
  const clean = { ...entityData };
  
  // Remove local-only fields
  delete clean.local_id;
  delete clean.synced;
  delete clean.created_offline;
  delete clean.last_modified;
  delete clean.version;
  delete clean.server_id;
  
  return clean;
}

/**
 * Map entity type to entity name
 */
function mapEntityType(entityType) {
  const mapping = {
    'field_dimensions': 'FieldDimension',
    'dimension_sets': 'DimensionSet',
    'benchmarks': 'Benchmark',
    'tasks': 'Task',
    'photos': 'Photo',
    'plans': 'Plan',
    'site_note_sessions': 'SiteNoteSession',
    'incidents': 'SafetyIncident'
  };
  
  return mapping[entityType] || entityType;
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  return currentSyncStatus;
}

/**
 * Update sync status
 */
function updateSyncStatus(status) {
  currentSyncStatus = status;
  notifyListeners(status);
}

/**
 * Subscribe to sync status changes
 */
export function subscribeToSync(listener) {
  syncListeners.push(listener);
  
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

/**
 * Notify listeners
 */
function notifyListeners(status) {
  syncListeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('Sync listener error:', error);
    }
  });
}