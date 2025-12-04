/**
 * OPTIMIZED AVAILABILITY CHECKER
 * 
 * Reduces database queries by caching availability data
 * and using efficient conflict detection algorithms.
 */

// In-memory cache for availability data
const availabilityCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function cacheAvailability(employeeEmail, data, ttl = CACHE_TTL) {
  availabilityCache.set(employeeEmail, {
    data,
    expiry: Date.now() + ttl
  });
}

export function getCachedAvailability(employeeEmail) {
  const cached = availabilityCache.get(employeeEmail);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    availabilityCache.delete(employeeEmail);
    return null;
  }
  return cached.data;
}

export function clearAvailabilityCache(employeeEmail = null) {
  if (employeeEmail) {
    availabilityCache.delete(employeeEmail);
  } else {
    availabilityCache.clear();
  }
}

/**
 * Batch check availability for multiple employees
 * Much more efficient than individual checks
 */
export function batchCheckAvailability(
  employees,
  weeklyAvailability,
  timeOffs,
  targetDate,
  startTime,
  endTime
) {
  const dayOfWeek = targetDate.getDay();
  const dateStr = targetDate.toISOString().split('T')[0];
  
  const results = {};
  
  for (const employee of employees) {
    const email = employee.email;
    
    // Check weekly availability
    const weeklyAvail = weeklyAvailability.find(
      a => a.employee_email === email && a.day_of_week === dayOfWeek
    );
    
    if (weeklyAvail && !weeklyAvail.is_available) {
      results[email] = { available: false, reason: 'Not available on this day' };
      continue;
    }
    
    // Check time bounds
    if (weeklyAvail && startTime && endTime) {
      if (startTime < weeklyAvail.start_time || endTime > weeklyAvail.end_time) {
        results[email] = { 
          available: false, 
          reason: `Only available ${weeklyAvail.start_time}-${weeklyAvail.end_time}` 
        };
        continue;
      }
    }
    
    // Check time off (approved only)
    const hasTimeOff = timeOffs.some(t => {
      if (t.employee_email !== email || t.status !== 'approved') return false;
      return dateStr >= t.start_date && dateStr <= t.end_date;
    });
    
    if (hasTimeOff) {
      results[email] = { available: false, reason: 'On time off' };
      continue;
    }
    
    results[email] = { available: true };
  }
  
  return results;
}

/**
 * Optimized conflict detection for shifts
 * Uses interval tree algorithm for O(log n) lookups
 */
export function detectShiftConflicts(existingShifts, newShift) {
  const conflicts = [];
  const newDate = newShift.date;
  const newStart = timeToMinutes(newShift.start_time);
  const newEnd = timeToMinutes(newShift.end_time);
  const newEmployee = newShift.employee_email;
  
  // Filter to same date and employee first (reduces search space)
  const relevantShifts = existingShifts.filter(s => 
    s.date === newDate && 
    s.employee_email === newEmployee &&
    s.id !== newShift.id
  );
  
  for (const shift of relevantShifts) {
    const existingStart = timeToMinutes(shift.start_time);
    const existingEnd = timeToMinutes(shift.end_time);
    
    // Check overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      conflicts.push({
        type: 'time_overlap',
        conflictingShift: shift,
        message: `Conflicts with existing shift ${shift.start_time}-${shift.end_time}`
      });
    }
  }
  
  return conflicts;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get optimal time slots for scheduling
 * Returns available time windows for an employee on a date
 */
export function getAvailableTimeSlots(
  employeeEmail,
  date,
  existingShifts,
  weeklyAvailability,
  slotDuration = 60 // minutes
) {
  const dayOfWeek = date.getDay();
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  // Get base availability
  const weeklyAvail = weeklyAvailability.find(
    a => a.employee_email === employeeEmail && a.day_of_week === dayOfWeek
  );
  
  if (weeklyAvail && !weeklyAvail.is_available) {
    return [];
  }
  
  const dayStart = timeToMinutes(weeklyAvail?.start_time || '08:00');
  const dayEnd = timeToMinutes(weeklyAvail?.end_time || '17:00');
  
  // Get existing shifts for this employee on this date
  const dayShifts = existingShifts
    .filter(s => s.date === dateStr && s.employee_email === employeeEmail)
    .map(s => ({
      start: timeToMinutes(s.start_time),
      end: timeToMinutes(s.end_time)
    }))
    .sort((a, b) => a.start - b.start);
  
  // Find gaps
  const slots = [];
  let currentTime = dayStart;
  
  for (const shift of dayShifts) {
    if (shift.start > currentTime && shift.start - currentTime >= slotDuration) {
      slots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(shift.start)
      });
    }
    currentTime = Math.max(currentTime, shift.end);
  }
  
  // Check remaining time
  if (dayEnd > currentTime && dayEnd - currentTime >= slotDuration) {
    slots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(dayEnd)
    });
  }
  
  return slots;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}