/**
 * SSOT Calendar Helpers
 * Shared utilities for calendar components to avoid logic duplication.
 */

/**
 * Dual-key employee match: user_id preferred, fallback to employee_email (legacy).
 * @param {object} shift - ScheduleShift record
 * @param {object} currentUser - Authenticated user from base44.auth.me()
 * @returns {boolean}
 */
export function isMyShift(shift, currentUser) {
  if (!shift || !currentUser) return false;
  if (shift.user_id && currentUser.id) return shift.user_id === currentUser.id;
  return shift.employee_email === currentUser.email;
}

/**
 * Detect overlapping shifts for the same employee.
 * Dual-key: matches by user_id if available, fallback to employee_email.
 * @param {Array} shifts - All existing shifts
 * @param {object} newShift - Shift being created/updated
 * @returns {Array} - Array of conflicting shifts
 */
export function detectConflicts(shifts, newShift) {
  if (!newShift.date || !newShift.start_time || !newShift.end_time) return [];

  const [newStartH, newStartM] = newShift.start_time.split(':').map(Number);
  const [newEndH, newEndM] = newShift.end_time.split(':').map(Number);
  const newStart = newStartH * 60 + newStartM;
  const newEnd = newEndH * 60 + newEndM;

  return shifts.filter(shift => {
    if (shift.id === newShift.id) return false;
    if (shift.date !== newShift.date) return false;
    if (!shift.start_time || !shift.end_time) return false;

    // Dual-key employee match
    const sameEmployee = (() => {
      if (newShift.user_id && shift.user_id) return shift.user_id === newShift.user_id;
      if (newShift.employee_email && shift.employee_email) return shift.employee_email === newShift.employee_email;
      return false;
    })();
    if (!sameEmployee) return false;

    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    return newStart < end && newEnd > start;
  });
}

/**
 * Get shifts for a specific employee+date using dual-key matching.
 * @param {Array} shifts
 * @param {object} employee - { id, email }
 * @param {string} dateStr - 'yyyy-MM-dd'
 * @returns {Array}
 */
export function getShiftsForEmployeeDay(shifts, employee, dateStr) {
  return shifts.filter(s => {
    if (s.date !== dateStr) return false;
    if (employee.id && s.user_id) return s.user_id === employee.id;
    return s.employee_email === employee.email;
  });
}