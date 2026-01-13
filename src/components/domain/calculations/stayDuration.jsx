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

   // DEBUG: Log each item's installation_time
   console.log('🔍 STAY CALC - Item installation times:', items.map(i => ({
     name: i.item_name,
     is_travel: i.is_travel_item,
     installation_time: i.installation_time,
     quantity: i.quantity,
     calculated: (i.installation_time || 0) * (i.quantity || 0)
   })));
   console.log('🔍 STAY CALC - Total labor hours:', totalLaborHours);
   console.log('🔍 STAY CALC - Travel time (one-way):', travelTimeHours, 'hours');

   if (totalLaborHours === 0) {
     return null;
   }

   // Step 1.5: Add travel time to labor hours (travel counts as work hours for day calculation)
   // Travel time = round-trip (counts as full hours against 8hr/day limit)
   const travelHoursInDays = travelTimeHours || 0;
   const totalHoursWithTravel = totalLaborHours + travelHoursInDays;

   // Step 2: Calculate work days (Monday-Friday only) - now includes travel hours
   const hoursPerDay = 8;
   const totalWorkDays = calculateWorkDays(totalHoursWithTravel, techCount);

  // Step 3: Convert work days into calendar days (including weekends)
  // Work schedule: Monday–Friday only
  // Always start work on Monday
  const workCalendarDays = calculateWorkCalendarDays(totalWorkDays);

  // Step 4: Add travel days (always 2: inbound Sunday + outbound day after last work day)
  // Travel CAN occur on weekends
  // Travel time >4h AUTO-adds 1 extra night + 1 per diem day (one-way, not round trip)
  let travelDays = 2;
  let extraTravelNights = 0;
  
  // If single trip is >4 hours, add 1 night + 1 per diem day
  if (travelTimeHours > 4) {
    extraTravelNights = 1;
    travelDays += 1; // Add 1 more day for the extra night
  }

  // Step 5: Total calendar days and nights
  // Calendar days = work days + weekends in between + travel days
  const totalCalendarDays = workCalendarDays + travelDays;
  
  // Nights = calendar days - 1 PLUS any extra travel nights
  const totalNights = (totalCalendarDays - 1) + extraTravelNights;

  // Weekends for display breakdown
  const weekends = Math.ceil(totalWorkDays / 5) * 2;

  // Step 6: Calculate hotel rooms and per diem
  // Hotel rooms: ceil(techs / 2) per night
  const suggestedRooms = Math.ceil(techCount / 2);
  
  // Total hotel rooms = nights × roomsPerNight
  const totalHotelRooms = totalNights * roomsPerNight;
  
  // Per diem days = calendar days (includes weekends and travel days)
  const totalPerDiem = totalCalendarDays * techCount;

  return {
    totalLaborHours,
    dailyCapacity: hoursPerDay * techCount,
    weeklyCapacity: hoursPerDay * techCount * 5,
    workDays: totalWorkDays,
    weekends,
    totalCalendarDays,
    totalNights,
    totalHotelRooms,
    totalPerDiem,
    suggestedRooms
  };
}