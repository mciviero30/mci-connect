/**
 * GOOGLE CALENDAR SYNC SERVICE
 * 
 * Handles bidirectional sync between ScheduleShift and Google Calendar.
 * Note: Requires backend functions with OAuth to be enabled.
 */

import { base44 } from '@/api/base44Client';

// Sync configuration
const SYNC_CONFIG = {
  calendarId: 'primary',
  syncInterval: 5 * 60 * 1000, // 5 minutes
  batchSize: 50,
};

/**
 * Check if Google Calendar is connected
 */
export async function isCalendarConnected() {
  try {
    // This would check the connector status
    // For now, return false until backend functions are enabled
    return false;
  } catch {
    return false;
  }
}

/**
 * Get Google Calendar OAuth URL
 */
export function getCalendarConnectURL() {
  // This would be replaced with actual OAuth URL from backend
  return base44.agents?.getWhatsAppConnectURL?.('googlecalendar') || null;
}

/**
 * Convert ScheduleShift to Google Calendar event
 */
export function shiftToCalendarEvent(shift) {
  const startDate = new Date(`${shift.date}T${shift.start_time || '09:00'}`);
  const endDate = new Date(`${shift.date}T${shift.end_time || '17:00'}`);
  
  return {
    summary: shift.shift_title || shift.job_name || 'Work Shift',
    description: [
      shift.notes,
      shift.job_name ? `Job: ${shift.job_name}` : null,
      shift.employee_name ? `Employee: ${shift.employee_name}` : null,
    ].filter(Boolean).join('\n'),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    extendedProperties: {
      private: {
        mci_shift_id: shift.id,
        mci_job_id: shift.job_id || '',
        mci_employee_email: shift.employee_email || '',
      },
    },
    colorId: getColorId(shift.color),
  };
}

/**
 * Convert Google Calendar event to ScheduleShift
 */
export function calendarEventToShift(event, existingShift = null) {
  const startDate = new Date(event.start.dateTime || event.start.date);
  const endDate = new Date(event.end.dateTime || event.end.date);
  
  return {
    ...existingShift,
    shift_title: event.summary || 'Calendar Event',
    date: startDate.toISOString().split('T')[0],
    start_time: startDate.toTimeString().slice(0, 5),
    end_time: endDate.toTimeString().slice(0, 5),
    notes: event.description || '',
    google_event_id: event.id,
    last_synced: new Date().toISOString(),
  };
}

/**
 * Map MCI color to Google Calendar color ID
 */
function getColorId(mciColor) {
  const colorMap = {
    red: '11',
    orange: '6',
    amber: '5',
    yellow: '5',
    green: '10',
    blue: '9',
    indigo: '9',
    purple: '3',
    pink: '4',
  };
  return colorMap[mciColor] || '9';
}

/**
 * Sync shifts to Google Calendar
 * Note: Requires backend function implementation
 */
export async function syncShiftsToCalendar(shifts) {
  if (!await isCalendarConnected()) {
    throw new Error('Google Calendar not connected');
  }
  
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };
  
  for (const shift of shifts) {
    try {
      const event = shiftToCalendarEvent(shift);
      
      if (shift.google_event_id) {
        // Update existing event
        // await updateCalendarEvent(shift.google_event_id, event);
        results.updated++;
      } else {
        // Create new event
        // const created = await createCalendarEvent(event);
        // await base44.entities.ScheduleShift.update(shift.id, { google_event_id: created.id });
        results.created++;
      }
    } catch (error) {
      results.errors.push({ shiftId: shift.id, error: error.message });
    }
  }
  
  return results;
}

/**
 * Sync from Google Calendar to MCI
 * Note: Requires backend function implementation
 */
export async function syncFromCalendar(startDate, endDate) {
  if (!await isCalendarConnected()) {
    throw new Error('Google Calendar not connected');
  }
  
  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };
  
  // This would fetch events from Google Calendar and sync them
  // Implementation requires backend functions with OAuth
  
  return results;
}

/**
 * Delete calendar event when shift is deleted
 */
export async function deleteCalendarEvent(googleEventId) {
  if (!googleEventId || !await isCalendarConnected()) {
    return false;
  }
  
  // Implementation requires backend function
  return true;
}

/**
 * Handle shift status changes (confirm/reject)
 */
export async function updateShiftStatus(shift, newStatus) {
  if (!shift.google_event_id || !await isCalendarConnected()) {
    return;
  }
  
  // Update event color/status in Google Calendar
  const colorMap = {
    confirmed: '10', // Green
    rejected: '11', // Red
    scheduled: '9', // Blue
  };
  
  // Implementation requires backend function
}

/**
 * Sync service status
 */
export function getSyncStatus() {
  const lastSync = localStorage.getItem('mci_gcal_last_sync');
  const syncEnabled = localStorage.getItem('mci_gcal_sync_enabled') === 'true';
  
  return {
    connected: false, // Would be true when OAuth is complete
    syncEnabled,
    lastSync: lastSync ? new Date(lastSync) : null,
    nextSync: lastSync 
      ? new Date(new Date(lastSync).getTime() + SYNC_CONFIG.syncInterval)
      : null,
  };
}

/**
 * Enable/disable sync
 */
export function setSyncEnabled(enabled) {
  localStorage.setItem('mci_gcal_sync_enabled', enabled.toString());
}

/**
 * Manual sync trigger
 */
export async function triggerSync() {
  const status = getSyncStatus();
  if (!status.connected) {
    throw new Error('Google Calendar not connected. Please connect in Settings.');
  }
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  
  // Get pending shifts
  const shifts = await base44.entities.ScheduleShift.filter({
    date: { $gte: startDate.toISOString().split('T')[0] }
  });
  
  // Sync both ways
  const toCalendar = await syncShiftsToCalendar(shifts);
  const fromCalendar = await syncFromCalendar(startDate, endDate);
  
  localStorage.setItem('mci_gcal_last_sync', new Date().toISOString());
  
  return {
    toCalendar,
    fromCalendar,
    syncedAt: new Date(),
  };
}

export default {
  isCalendarConnected,
  getCalendarConnectURL,
  syncShiftsToCalendar,
  syncFromCalendar,
  deleteCalendarEvent,
  updateShiftStatus,
  getSyncStatus,
  setSyncEnabled,
  triggerSync,
  shiftToCalendarEvent,
  calendarEventToShift,
};