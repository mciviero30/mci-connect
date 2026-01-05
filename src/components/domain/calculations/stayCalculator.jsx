/**
 * STAY DURATION CALCULATOR - Pure calculation logic
 * Calculates work days, stay duration, hotel nights, and per diem
 */

/**
 * Calculate work days (Mon-Fri only) from labor hours
 * @param {number} totalLaborHours - Total installation hours
 * @param {number} technicians - Number of technicians
 * @param {number} hoursPerDay - Work hours per day (default 8)
 * @returns {number} - Work days needed (rounded up)
 */
export function calculateWorkDays(totalLaborHours, technicians, hoursPerDay = 8) {
  if (technicians <= 0 || hoursPerDay <= 0) return 0;
  
  const hoursPerTech = totalLaborHours / technicians;
  const workDays = hoursPerTech / hoursPerDay;
  
  return Math.ceil(workDays);
}

/**
 * Calculate total calendar days including weekends
 * @param {number} workDays - Work days (Mon-Fri)
 * @returns {number} - Total calendar days including weekends
 */
export function calculateCalendarDays(workDays) {
  if (workDays <= 0) return 0;
  
  const fullWeeks = Math.floor(workDays / 5);
  const remainingDays = workDays % 5;
  
  return (fullWeeks * 7) + remainingDays;
}

/**
 * Calculate hotel nights needed
 * @param {number} calendarDays - Total calendar days
 * @param {boolean} hasTravelDays - If travel days are needed (>4h drive)
 * @returns {number} - Hotel nights (calendar days - 1, or +2 if travel)
 */
export function calculateHotelNights(calendarDays, hasTravelDays = false) {
  if (calendarDays <= 0) return 0;
  
  // Base: calendar days - 1 (last day they leave)
  let nights = calendarDays - 1;
  
  // Add 2 nights if travel days (1 before, 1 after)
  if (hasTravelDays) {
    nights += 2;
  }
  
  return Math.max(0, nights);
}

/**
 * Calculate total hotel rooms needed
 * @param {number} nights - Hotel nights
 * @param {number} technicians - Number of technicians
 * @param {number} techsPerRoom - Technicians per room (default 2)
 * @returns {number} - Total rooms needed
 */
export function calculateTotalHotelRooms(nights, technicians, techsPerRoom = 2) {
  if (nights <= 0 || technicians <= 0) return 0;
  
  const roomsPerNight = Math.ceil(technicians / techsPerRoom);
  return nights * roomsPerNight;
}

/**
 * Calculate per diem days
 * @param {number} calendarDays - Total calendar days
 * @param {boolean} hasTravelDays - If travel days are needed
 * @returns {number} - Per diem days (includes travel days if applicable)
 */
export function calculatePerDiemDays(calendarDays, hasTravelDays = false) {
  if (calendarDays <= 0) return 0;
  
  let days = calendarDays;
  
  // Add 2 days if travel (1 before, 1 after)
  if (hasTravelDays) {
    days += 2;
  }
  
  return days;
}

/**
 * Calculate total per diem cost
 * @param {number} days - Per diem days
 * @param {number} technicians - Number of technicians
 * @param {number} ratePerDay - Per diem rate per technician per day (default 75)
 * @returns {number} - Total per diem cost
 */
export function calculateTotalPerDiem(days, technicians, ratePerDay = 75) {
  if (days <= 0 || technicians <= 0) return 0;
  
  return days * technicians * ratePerDay;
}

/**
 * Calculate complete stay breakdown
 * @param {number} totalLaborHours - Total installation hours
 * @param {number} technicians - Number of technicians
 * @param {boolean} hasTravelDays - If travel days needed (>4h drive)
 * @param {Object} config - Configuration { hoursPerDay, techsPerRoom, perDiemRate }
 * @returns {Object} - Complete breakdown
 */
export function calculateStayBreakdown(totalLaborHours, technicians, hasTravelDays = false, config = {}) {
  const {
    hoursPerDay = 8,
    techsPerRoom = 2,
    perDiemRate = 75
  } = config;
  
  const workDays = calculateWorkDays(totalLaborHours, technicians, hoursPerDay);
  const calendarDays = calculateCalendarDays(workDays);
  const hotelNights = calculateHotelNights(calendarDays, hasTravelDays);
  const totalRooms = calculateTotalHotelRooms(hotelNights, technicians, techsPerRoom);
  const perDiemDays = calculatePerDiemDays(calendarDays, hasTravelDays);
  const totalPerDiem = calculateTotalPerDiem(perDiemDays, technicians, perDiemRate);
  
  return {
    workDays,
    calendarDays,
    hotelNights,
    totalRooms,
    perDiemDays,
    totalPerDiem,
    technicians
  };
}