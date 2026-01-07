/**
 * Offline-Safe Approval Queue for Field Dimensions
 * 
 * Queues approvals offline and syncs when online
 * Resolves conflicts by latest approved version
 */

const APPROVAL_QUEUE_KEY = 'dimension_approval_queue';
const QUEUE_VERSION = '1.0';

/**
 * Queue approval offline
 */
export async function queueApprovalOffline(approvalRecord) {
  try {
    const queue = await loadQueue();
    
    const queuedItem = {
      id: generateQueueId(),
      approval_record: approvalRecord,
      queued_at: new Date().toISOString(),
      sync_status: 'pending',
      retry_count: 0,
      last_error: null
    };
    
    queue.items.push(queuedItem);
    await saveQueue(queue);
    
    return queuedItem;
  } catch (error) {
    console.error('Failed to queue approval offline:', error);
    throw error;
  }
}

/**
 * Load approval queue from localStorage
 */
async function loadQueue() {
  try {
    const stored = localStorage.getItem(APPROVAL_QUEUE_KEY);
    if (!stored) {
      return {
        version: QUEUE_VERSION,
        items: [],
        last_sync: null
      };
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load approval queue:', error);
    return {
      version: QUEUE_VERSION,
      items: [],
      last_sync: null
    };
  }
}

/**
 * Save approval queue to localStorage
 */
async function saveQueue(queue) {
  try {
    localStorage.setItem(APPROVAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save approval queue:', error);
    throw error;
  }
}

/**
 * Generate unique queue item ID
 */
function generateQueueId() {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sync approval queue
 */
export async function syncApprovalQueue(base44Client) {
  const queue = await loadQueue();
  const results = {
    total: queue.items.length,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: []
  };
  
  if (queue.items.length === 0) {
    return results;
  }
  
  for (const item of queue.items) {
    if (item.sync_status === 'synced') {
      results.synced++;
      continue;
    }
    
    try {
      // Apply approval via API
      const approvalResult = await applyApprovalRemote(item.approval_record, base44Client);
      
      if (approvalResult.success) {
        item.sync_status = 'synced';
        item.synced_at = new Date().toISOString();
        results.synced++;
      } else if (approvalResult.conflict) {
        item.sync_status = 'conflict';
        item.last_error = approvalResult.error;
        results.conflicts++;
      } else {
        throw new Error(approvalResult.error);
      }
    } catch (error) {
      item.sync_status = 'error';
      item.last_error = error.message;
      item.retry_count++;
      results.failed++;
      results.errors.push({
        queue_id: item.id,
        error: error.message
      });
    }
  }
  
  // Update queue
  queue.last_sync = new Date().toISOString();
  
  // Remove successfully synced items
  queue.items = queue.items.filter(item => item.sync_status !== 'synced');
  
  await saveQueue(queue);
  
  return results;
}

/**
 * Apply approval remotely (stub - to be implemented with actual API)
 */
async function applyApprovalRemote(approvalRecord, base44Client) {
  // This would be implemented by calling a backend function or entity update
  // For now, return stub response
  
  try {
    // 1. Fetch current dimension set
    const dimensionSets = await base44Client.entities.DimensionSet.filter({ 
      id: approvalRecord.dimension_set_id 
    });
    
    if (dimensionSets.length === 0) {
      return {
        success: false,
        conflict: false,
        error: 'Dimension set not found'
      };
    }
    
    const currentSet = dimensionSets[0];
    
    // 2. Check for conflicts (server version changed)
    if (currentSet.last_approval_at && 
        currentSet.last_approval_at > approvalRecord.approved_at) {
      return {
        success: false,
        conflict: true,
        error: 'Dimension set was updated by another user. Please refresh and retry.',
        server_version: currentSet
      };
    }
    
    // 3. Apply approval (update dimension set)
    const updatedSet = {
      approval_status: approvalRecord.to_state,
      last_approval_at: approvalRecord.approved_at,
      last_approver_id: approvalRecord.approver_id,
      last_approver_name: approvalRecord.approver_name,
      approval_history: [
        ...(currentSet.approval_history || []),
        {
          state: approvalRecord.to_state,
          approver: approvalRecord.approver_name,
          role: approvalRecord.approver_role,
          at: approvalRecord.approved_at,
          notes: approvalRecord.approval_notes
        }
      ]
    };
    
    // Add locked metadata if locking
    if (approvalRecord.to_state === APPROVAL_STATES.LOCKED) {
      updatedSet.locked_at = approvalRecord.approved_at;
      updatedSet.locked_by = approvalRecord.approver_id;
      updatedSet.locked_by_name = approvalRecord.approver_name;
    }
    
    await base44Client.entities.DimensionSet.update(currentSet.id, updatedSet);
    
    return {
      success: true,
      conflict: false,
      updated_set: updatedSet
    };
  } catch (error) {
    return {
      success: false,
      conflict: false,
      error: error.message
    };
  }
}

/**
 * Resolve approval conflict (latest approved version wins)
 */
export function resolveApprovalConflict(localApproval, serverDimensionSet) {
  const serverApprovalDate = new Date(serverDimensionSet.last_approval_at || 0);
  const localApprovalDate = new Date(localApproval.approved_at);
  
  // Server version is newer - discard local
  if (serverApprovalDate > localApprovalDate) {
    return {
      resolution: 'use_server',
      reason: 'Server version is newer',
      action: 'discard_local',
      server_version: serverDimensionSet
    };
  }
  
  // Local version is newer - retry sync
  if (localApprovalDate > serverApprovalDate) {
    return {
      resolution: 'use_local',
      reason: 'Local version is newer',
      action: 'retry_sync',
      approval: localApproval
    };
  }
  
  // Same timestamp - use higher approval state
  const stateOrder = [
    APPROVAL_STATES.DRAFT,
    APPROVAL_STATES.FIELD_VERIFIED,
    APPROVAL_STATES.SUPERVISOR_APPROVED,
    APPROVAL_STATES.PRODUCTION_APPROVED,
    APPROVAL_STATES.LOCKED
  ];
  
  const serverStateIndex = stateOrder.indexOf(serverDimensionSet.approval_status);
  const localStateIndex = stateOrder.indexOf(localApproval.to_state);
  
  if (serverStateIndex >= localStateIndex) {
    return {
      resolution: 'use_server',
      reason: 'Server has higher or equal approval state',
      action: 'discard_local',
      server_version: serverDimensionSet
    };
  }
  
  return {
    resolution: 'use_local',
    reason: 'Local has higher approval state',
    action: 'retry_sync',
    approval: localApproval
  };
}

/**
 * Get pending approvals count
 */
export async function getPendingApprovalsCount() {
  const queue = await loadQueue();
  return queue.items.filter(item => item.sync_status === 'pending').length;
}

/**
 * Clear synced approvals from queue
 */
export async function clearSyncedApprovals() {
  const queue = await loadQueue();
  queue.items = queue.items.filter(item => item.sync_status !== 'synced');
  await saveQueue(queue);
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const queue = await loadQueue();
  
  return {
    total_items: queue.items.length,
    pending: queue.items.filter(i => i.sync_status === 'pending').length,
    synced: queue.items.filter(i => i.sync_status === 'synced').length,
    error: queue.items.filter(i => i.sync_status === 'error').length,
    conflict: queue.items.filter(i => i.sync_status === 'conflict').length,
    last_sync: queue.last_sync
  };
}