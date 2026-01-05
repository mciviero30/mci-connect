/**
 * STAY DURATION CALCULATOR
 * Pure functions for calculating project duration, hotel, and per diem
 * NO React, NO side effects - 100% deterministic
 */

/**
 * Convert work days into calendar days (including weekends)
 * Projects start Monday, work is Mon-Fri only
 * @param {number} workDays - Number of work days (Mon-Fri)
 * @returns {number} - Calendar days including weekends
 */
export function convertWorkDaysToCalendarDays(workDays) {
  if (workDays === 0) return 0;
  
  // Full weeks: 5 work days = 7 calendar days
  const fullWeeks = Math.floor(workDays / 5);
  const remainingWorkDays = workDays % 5;
  
  // Each full week = 7 calendar days
  let calendarDays = fullWeeks * 7 + remainingWorkDays;
  
  // If there are remaining work days, they span into next week (add weekend)
  if (remainingWorkDays > 0) {
    calendarDays += 2;
  }
  
  return calendarDays;
}

/**
 * Calculate number of weekends in the project
 * @param {number} workDays - Number of work days
 * @returns {number} - Number of weekend days
 */
export function calculateWeekends(workDays) {
  if (workDays === 0) return 0;
  return Math.ceil(workDays / 5) * 2;
}

/**
 * Calculate total project duration including travel
 * @param {number} workCalendarDays - Calendar days for work (including weekends)
 * @param {number} travelTimeHours - One-way travel time in hours (optional)
 * @returns {Object} - { travelDays, totalCalendarDays, totalNights }
 */
export function calculateProjectDuration(workCalendarDays, travelTimeHours = 0) {
  // Travel days: arrive Sunday, leave day after last work day
  const baseTravelDays = 2;
  
  // Add extra travel days if travel time > 4 hours
  const extraTravelDays = travelTimeHours > 4 ? 2 : 0;
  const totalTravelDays = baseTravelDays + extraTravelDays;
  
  const totalCalendarDays = workCalendarDays + totalTravelDays;
  const totalNights = totalCalendarDays - 1;
  
  return {
    travelDays: totalTravelDays,
    extraTravelDays,
    totalCalendarDays,
    totalNights
  };
}

/**
 * Calculate hotel rooms needed
 * @param {number} totalNights - Total nights of stay
 * @param {number} techCount - Number of technicians
 * @param {number} roomsPerNight - Rooms per night (default: ceil(techCount/2))
 * @returns {number} - Total hotel rooms needed
 */
export function calculateHotelRooms(totalNights, techCount, roomsPerNight = null) {
  if (totalNights === 0) return 0;
  
  // Default: 2 techs per room
  const rooms = roomsPerNight !== null ? roomsPerNight : Math.ceil(techCount / 2);
  
  return totalNights * rooms;
}

/**
 * Calculate per diem quantity
 * @param {number} totalCalendarDays - Total calendar days
 * @param {number} techCount - Number of technicians
 * @returns {number} - Total per diem days
 */
export function calculatePerDiem(totalCalendarDays, techCount) {
  if (totalCalendarDays === 0 || techCount === 0) return 0;
  return totalCalendarDays * techCount;
}

/**
 * Get suggested rooms per night
 * @param {number} techCount - Number of technicians
 * @returns {number} - Suggested rooms (2 techs per room)
 */
export function getSuggestedRoomsPerNight(techCount) {
  return Math.ceil(techCount / 2);
}