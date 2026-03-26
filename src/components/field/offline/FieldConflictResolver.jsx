/**
 * Field Conflict Resolver
 * 
 * Version-based conflict resolution (never overwrites)
 */

/**
 * Conflict types
 */
export const CONFLICT_TYPES = {
  VERSION: 'version_conflict',
  DUPLICATE: 'duplicate',
  DELETE: 'delete_conflict'
};

/**
 * Resolve conflict
 */
export async function resolveConflict(conflict, localData, user) {
  const conflictType = conflict.type;
  
  if (conflictType === CONFLICT_TYPES.VERSION) {
    return resolveVersionConflict(conflict, localData, user);
  }
  
  if (conflictType === CONFLICT_TYPES.DUPLICATE) {
    return resolveDuplicateConflict(conflict, localData);
  }
  
  if (conflictType === CONFLICT_TYPES.DELETE) {
    return resolveDeleteConflict(conflict, localData);
  }
  
  // Default: preserve both
  return {
    action: 'create_version',
    resolved_data: localData,
    conflict_log: conflict
  };
}

/**
 * Resolve version conflict
 * HARDENED: Never overwrites field-created data
 */
function resolveVersionConflict(conflict, localData, user) {
  const serverData = conflict.server;
  const serverVersion = serverData.version || 1;
  const localVersion = localData.version || 1;
  
  // CRITICAL: Field data always wins for measurements
  // Office can annotate, but cannot change field-captured values
  const isFieldMeasurement = localData.measured_by || localData.recorded_by;
  
  if (isFieldMeasurement) {
    // Field-captured data: preserve local, merge server annotations only
    const resolved = {
      ...localData,
      // Merge factory annotations if present (non-destructive)
      factory_production_notes: serverData.factory_production_notes || localData.factory_production_notes,
      factory_cut_instructions: serverData.factory_cut_instructions || localData.factory_cut_instructions,
      factory_annotations_shared: serverData.factory_annotations_shared || localData.factory_annotations_shared,
      // Version bump
      version: Math.max(serverVersion, localVersion) + 1,
      notes: `${localData.notes || ''}\n[Sync: Field data preserved, factory annotations merged]`,
    };
    
    return {
      action: 'update',
      resolved_data: resolved,
      conflict_log: {
        type: 'field_wins',
        server_version: serverVersion,
        local_version: localVersion,
        resolution: 'field_data_preserved',
        timestamp: Date.now(),
      }
    };
  }
  
  // Server is newer - create new version
  if (serverVersion > localVersion) {
    return {
      action: 'create_version',
      resolved_data: {
        ...localData,
        parent_version_id: serverData.id,
        version: serverVersion + 1,
        notes: `${localData.notes || ''}\n[Conflict resolution: created new version from offline changes]`
      },
      conflict_log: {
        type: 'version_conflict',
        server_version: serverVersion,
        local_version: localVersion,
        resolution: 'new_version',
        timestamp: Date.now()
      }
    };
  }
  
  // Local is same or newer - update
  return {
    action: 'update',
    resolved_data: localData,
    conflict_log: null
  };
}

/**
 * Resolve duplicate conflict
 */
function resolveDuplicateConflict(conflict, localData) {
  const serverData = conflict.server;
  
  // Check timestamps
  const serverTime = new Date(serverData.created_date).getTime();
  const localTime = localData.created_offline || Date.now();
  
  // Server is older - skip local
  if (serverTime < localTime) {
    return {
      action: 'skip',
      server_id: serverData.id,
      resolved_data: null,
      conflict_log: {
        type: 'duplicate',
        resolution: 'skip_local',
        reason: 'Server copy is older',
        timestamp: Date.now()
      }
    };
  }
  
  // Local is older - create with note
  return {
    action: 'create_with_note',
    resolved_data: {
      ...localData,
      notes: `${localData.notes || ''}\n[Possible duplicate - review against ID: ${serverData.id}]`
    },
    conflict_log: {
      type: 'duplicate',
      resolution: 'create_with_note',
      duplicate_id: serverData.id,
      timestamp: Date.now()
    }
  };
}

/**
 * Resolve delete conflict
 */
function resolveDeleteConflict(conflict, localData) {
  // If server deleted and local modified, recreate
  return {
    action: 'recreate',
    resolved_data: {
      ...localData,
      notes: `${localData.notes || ''}\n[Recreated after server deletion]`
    },
    conflict_log: {
      type: 'delete_conflict',
      resolution: 'recreate',
      timestamp: Date.now()
    }
  };
}

/**
 * Log conflict for audit
 */
export async function logConflict(conflictData, localId, serverId) {
  // Store conflict log in IndexedDB for review
  const db = await openConflictLog();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    
    const log = {
      local_id: localId,
      server_id: serverId,
      conflict_data: conflictData,
      timestamp: Date.now(),
      resolved: true
    };
    
    const request = store.add(log);
    request.onsuccess = () => resolve(log);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Open conflict log database
 */
async function openConflictLog() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mci_field_conflicts', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('conflicts')) {
        const store = db.createObjectStore('conflicts', { autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('local_id', 'local_id', { unique: false });
      }
    };
  });
}

/**
 * Get conflict history
 */
export async function getConflictHistory() {
  const db = await openConflictLog();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conflicts'], 'readonly');
    const store = transaction.objectStore('conflicts');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear old conflicts (O3 FIX)
 * Purges conflict logs older than specified days
 * Prevents IndexedDB bloat on high-conflict scenarios
 */
export async function clearOldConflicts(maxAgeDays = 30) {
  try {
    const db = await openConflictLog();
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      const index = store.index('timestamp');
      const request = index.openCursor();
      
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const conflict = cursor.value;
          
          // Delete if older than cutoff
          if (conflict.timestamp < cutoffTime) {
            store.delete(cursor.primaryKey);
            deletedCount++;
          }
          
          cursor.continue();
        } else {
          // Done iterating
          if (import.meta.env?.DEV && deletedCount > 0) {
          }
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[ConflictCleanup] Failed to clear old conflicts:', error);
    return 0;
  }
}