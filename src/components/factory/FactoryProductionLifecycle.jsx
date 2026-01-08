/**
 * Factory Production Lifecycle
 * 
 * Manages production status transitions (Factory-controlled)
 */

import { base44 } from '@/api/base44Client';

/**
 * Production lifecycle states
 */
export const PRODUCTION_STATUS = {
  PENDING: 'pending',
  APPROVED_FOR_PRODUCTION: 'approved_for_production',
  IN_FABRICATION: 'in_fabrication',
  FABRICATED: 'fabricated',
  QC_CHECKED: 'qc_checked',
  READY_FOR_INSTALL: 'ready_for_install',
  INSTALLED: 'installed'
};

/**
 * Status metadata
 */
export const STATUS_METADATA = {
  [PRODUCTION_STATUS.PENDING]: {
    label: 'Pending',
    color: 'slate',
    description: 'Awaiting production approval',
    can_fabricate: false
  },
  [PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION]: {
    label: 'Approved for Production',
    color: 'blue',
    description: 'Ready to begin fabrication',
    can_fabricate: true
  },
  [PRODUCTION_STATUS.IN_FABRICATION]: {
    label: 'In Fabrication',
    color: 'amber',
    description: 'Currently being fabricated',
    can_fabricate: false
  },
  [PRODUCTION_STATUS.FABRICATED]: {
    label: 'Fabricated',
    color: 'purple',
    description: 'Fabrication complete, awaiting QC',
    can_fabricate: false
  },
  [PRODUCTION_STATUS.QC_CHECKED]: {
    label: 'QC Checked',
    color: 'green',
    description: 'Quality control passed',
    can_fabricate: false
  },
  [PRODUCTION_STATUS.READY_FOR_INSTALL]: {
    label: 'Ready for Install',
    color: 'emerald',
    description: 'Ready for field installation',
    can_fabricate: false
  },
  [PRODUCTION_STATUS.INSTALLED]: {
    label: 'Installed',
    color: 'green',
    description: 'Installed on site',
    can_fabricate: false
  }
};

/**
 * Valid transitions (Factory-enforced)
 */
const VALID_TRANSITIONS = {
  [PRODUCTION_STATUS.PENDING]: [PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION],
  [PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION]: [PRODUCTION_STATUS.IN_FABRICATION, PRODUCTION_STATUS.PENDING],
  [PRODUCTION_STATUS.IN_FABRICATION]: [PRODUCTION_STATUS.FABRICATED, PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION],
  [PRODUCTION_STATUS.FABRICATED]: [PRODUCTION_STATUS.QC_CHECKED, PRODUCTION_STATUS.IN_FABRICATION],
  [PRODUCTION_STATUS.QC_CHECKED]: [PRODUCTION_STATUS.READY_FOR_INSTALL, PRODUCTION_STATUS.FABRICATED],
  [PRODUCTION_STATUS.READY_FOR_INSTALL]: [PRODUCTION_STATUS.INSTALLED, PRODUCTION_STATUS.QC_CHECKED],
  [PRODUCTION_STATUS.INSTALLED]: []
};

/**
 * Change production status (Factory only)
 */
export async function changeProductionStatus(dimensionSetId, newStatus, user, notes = '') {
  try {
    const dimensionSet = await base44.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    const currentStatus = dimensionSet.production_status || PRODUCTION_STATUS.PENDING;
    
    // Validate transition
    if (!canTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }
    
    // Build history entry
    const historyEntry = {
      from_status: currentStatus,
      to_status: newStatus,
      changed_by: user.email,
      changed_by_name: user.full_name,
      changed_at: new Date().toISOString(),
      notes,
      changed_from_mode: 'factory'
    };
    
    const history = dimensionSet.production_status_history || [];
    history.push(historyEntry);
    
    // Update status
    await base44.entities.DimensionSet.update(dimensionSetId, {
      production_status: newStatus,
      production_status_history: history,
      production_status_requested: null,
      production_request_notes: null
    });
    
    return {
      success: true,
      new_status: newStatus,
      history_entry: historyEntry
    };
    
  } catch (error) {
    console.error('Failed to change production status:', error);
    throw error;
  }
}

/**
 * Request status change from Field (not direct change)
 */
export async function requestStatusChange(dimensionSetId, requestedStatus, user, notes) {
  try {
    await base44.entities.DimensionSet.update(dimensionSetId, {
      production_status_requested: requestedStatus,
      production_request_notes: notes
    });
    
    return {
      success: true,
      requested_status: requestedStatus
    };
    
  } catch (error) {
    console.error('Failed to request status change:', error);
    throw error;
  }
}

/**
 * Check if transition is valid
 */
export function canTransition(fromStatus, toStatus) {
  const allowedNext = VALID_TRANSITIONS[fromStatus] || [];
  return allowedNext.includes(toStatus);
}

/**
 * Get next available statuses
 */
export function getNextStatuses(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Get status badge props
 */
export function getStatusBadgeProps(status) {
  const metadata = STATUS_METADATA[status] || STATUS_METADATA[PRODUCTION_STATUS.PENDING];
  
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };
  
  return {
    label: metadata.label,
    className: colorClasses[metadata.color],
    description: metadata.description,
    can_fabricate: metadata.can_fabricate
  };
}