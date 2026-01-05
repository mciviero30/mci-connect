/**
 * STAY DURATION CALCULATION ENGINE
 * Pure functions for calculating project stay duration
 * NO React dependencies - deterministic and side-effect free
 */

/**
 * Calculate total labor hours from quote items
 * @param {Array} items - Quote items array
 * @returns {number} - Total labor hours
 */
export function calculateTotalLaborHours(items = []) {
  return items
    .filter(item => !item.is_travel_item)
    .reduce((sum, item) => {
      const hours = parseFloat(item.installation_time) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + (hours * qty);
    }, 0);
}

/**
 * Calculate work days from labor hours
 * @param {number} totalLaborHours - Total labor hours
 * @param {number} techCount - Number of technicians
 * @returns {number} - Work days (rounded to nearest 0.5)
 */
export function calculateWorkDays(totalLaborHours, techCount) {
  const hoursPerDay = 8;
  let totalWorkDays = totalLaborHours / (hoursPerDay * techCount);
  
  // Round to nearest 0.5 day
  return Math.round(totalWorkDays * 2) / 2;
}

/**
 * Convert work days into calendar days (including weekends)
 * @param {number} totalWorkDays - Work days (Mon-Fri only)
 * @returns {number} - Calendar days including weekends
 */
export function calculateWorkCalendarDays(totalWorkDays) {
  // Project starts on Monday, work is Mon-Fri only
  const fullWeeks = Math.floor(totalWorkDays / 5);
  const remainingWorkDays = totalWorkDays % 5;
  
  // Calendar days = work days + weekends
  // Each full week = 5 work days + 2 weekend days = 7 calendar days
  // Remaining work days span into next week (adds 2 weekend days if > 0)
  let workCalendarDays = (fullWeeks * 7) + remainingWorkDays;
  if (remainingWorkDays > 0) {
    workCalendarDays += 2; // Add weekend after partial week
  }

  return workCalendarDays;
}

/**
 * Calculate complete stay duration
 * @param {Object} params - { items, techCount, travelTimeHours, roomsPerNight }
 * @returns {Object|null} - Calculations object or null if no labor hours
 */
export function calculateStayDuration({ items, techCount, travelTimeHours, roomsPerNight }) {
  // Step 1: Sum labor hours from all items
  const totalLaborHours = calculateTotalLaborHours(items);

  if (totalLaborHours === 0) {
    return null;
  }

  // Step 2: Calculate work days (Monday-Friday only)
  const hoursPerDay = 8;
  const totalWorkDays = calculateWorkDays(totalLaborHours, techCount);

  // Step 3: Add travel days (always 2: inbound Sunday + outbound day after last work day)
  const travelDays = 2;

  // Step 4: Convert work days into calendar days (including weekends)
  const workCalendarDays = calculateWorkCalendarDays(totalWorkDays);

  // Step 5: Total calendar days and nights
  // Travel: arrive Sunday, leave day after last work day
  const totalCalendarDays = workCalendarDays + travelDays;
  const totalNights = totalCalendarDays - 1;

  // For display
  const weekends = Math.ceil(totalWorkDays / 5) * 2;
  const extraTravelDays = travelTimeHours > 4 ? 2 : 0;

  // Step 6: Calculate hotel rooms and per diem
  const suggestedRooms = Math.ceil(techCount / 2);

  const totalHotelRooms = totalNights * roomsPerNight;
  const totalPerDiem = totalCalendarDays * techCount;

  return {
    totalLaborHours,
    dailyCapacity: hoursPerDay * techCount,
    weeklyCapacity: hoursPerDay * techCount * 5,
    workDays: totalWorkDays,
    weekends,
    extraTravelDays,
    totalCalendarDays,
    totalNights,
    totalHotelRooms,
    totalPerDiem,
    suggestedRooms
  };
}