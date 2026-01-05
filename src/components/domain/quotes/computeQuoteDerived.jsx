/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH FOR QUOTE DERIVED CALCULATIONS
 * ============================================================================
 * 
 * ⚠️ CRITICAL: This is the ONLY place where project duration, hotel rooms,
 * and per diem calculations are allowed.
 * 
 * DO NOT duplicate this logic anywhere else in the codebase.
 * All components, hooks, and calculations MUST use this function.
 * 
 * ============================================================================
 * BUSINESS RULES:
 * ============================================================================
 * 
 * 1. LABOR HOURS
 *    - Sum all items with installation_time
 *    - Formula: totalLaborHours = Σ(installation_time × quantity)
 * 
 * 2. WORK DAYS
 *    - Based on techs and hours per day
 *    - Formula: workDays = totalLaborHours / (hoursPerDay × techs)
 *    - Always round to nearest 0.5 day
 * 
 * 3. CALENDAR DAYS
 *    - Convert work days (Mon-Fri) to calendar days (including weekends)
 *    - Assumes Monday start
 *    - Formula: calendarDays = workDays + weekends in span
 * 
 * 4. TRAVEL DAYS
 *    - If one-way travel > 4 hours, add full travel days
 *    - Formula: travelDays = 2 (round trip)
 * 
 * 5. NIGHTS
 *    - nights = max(calendarDays - 1, 0)
 *    - Cannot be negative
 * 
 * 6. HOTEL ROOMS
 *    - 2 techs per room
 *    - Formula: hotelRooms = ceil(techs / 2) × nights
 * 
 * 7. PER DIEM
 *    - One per diem per tech per calendar day
 *    - Formula: perDiemDays = techs × calendarDays
 * 
 * ============================================================================
 */

/**
 * Convert work days (Mon-Fri) to calendar days (including weekends)
 * Assumes project starts on Monday
 * 
 * @param {number} workDays - Number of work days (rounded to 0.5)
 * @returns {number} - Total calendar days including weekends
 */
function convertWorkDaysToCalendarDays(workDays) {
  if (workDays <= 0) return 0;
  
  // Full weeks (5 work days = 7 calendar days)
  const fullWeeks = Math.floor(workDays / 5);
  const remainingDays = workDays % 5;
  
  // Calendar days = full weeks (7 days each) + remaining work days
  let calendarDays = (fullWeeks * 7) + remainingDays;
  
  // If remaining days cross into weekend (Friday -> Monday)
  // Friday = 5th day, so if remainingDays > 0, we're in weekend territory
  if (remainingDays > 4) {
    calendarDays += 2; // Add Saturday + Sunday
  }
  
  return calendarDays;
}

/**
 * Round work days to nearest 0.5 day
 * Examples: 2.3 → 2.5, 2.7 → 3.0, 2.2 → 2.0
 * 
 * @param {number} days - Raw work days
 * @returns {number} - Rounded to 0.5 increment
 */
function roundToHalfDay(days) {
  return Math.round(days * 2) / 2;
}

/**
 * ============================================================================
 * MAIN COMPUTATION FUNCTION
 * ============================================================================
 * 
 * Computes ALL derived values for a quote in a single pass.
 * This function is 100% pure - no mutations, no side effects, no external dependencies.
 * 
 * @param {Object} params - Input parameters
 * @param {Array} params.items - Quote items with installation_time and quantity
 * @param {number} params.techs - Number of technicians (default: 2)
 * @param {Object} params.travel - Travel configuration
 * @param {boolean} params.travel.enabled - Is travel required?
 * @param {number} params.travel.hours - One-way travel time in hours
 * @param {Object} params.calendar - Calendar configuration
 * @param {number} params.calendar.hoursPerDay - Work hours per day (default: 8)
 * @param {Array<number>} params.calendar.workDays - Days of week that are work days [1-5] = Mon-Fri
 * @param {number} params.roomsPerNight - Hotel rooms needed per night (optional override)
 * 
 * @returns {Object} Derived values
 * @returns {number} .totalLaborHours - Total installation hours
 * @returns {number} .workDays - Work days (rounded to 0.5)
 * @returns {number} .calendarDays - Total calendar days (including weekends)
 * @returns {number} .travelDays - Additional travel days (0 or 2)
 * @returns {number} .totalCalendarDays - Calendar days + travel days
 * @returns {number} .nights - Number of nights stay
 * @returns {number} .hotelRooms - Total hotel room-nights needed
 * @returns {number} .perDiemDays - Total per diem days (techs × days)
 * @returns {Object} .breakdown - Detailed breakdown for debugging
 */
export function computeQuoteDerived(params) {
  // ============================================================================
  // STEP 0: VALIDATE AND NORMALIZE INPUTS
  // ============================================================================
  
  const {
    items = [],
    techs = 2,
    travel = { enabled: false, hours: 0 },
    calendar = { hoursPerDay: 8, workDays: [1, 2, 3, 4, 5] },
    roomsPerNight = null // Optional manual override
  } = params;
  
  // Validate inputs
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }
  
  if (typeof techs !== 'number' || techs <= 0) {
    throw new Error('techs must be a positive number');
  }
  
  const hoursPerDay = calendar.hoursPerDay || 8;
  const travelEnabled = travel?.enabled || false;
  const travelHours = travel?.hours || 0;
  
  // ============================================================================
  // STEP 1: CALCULATE TOTAL LABOR HOURS
  // ============================================================================
  
  const totalLaborHours = items.reduce((sum, item) => {
    const installTime = parseFloat(item.installation_time) || 0;
    const qty = parseFloat(item.quantity) || 0;
    
    // Only count items with installation_time
    // Skip travel items and items without installation_time
    if (installTime > 0 && !item.is_travel_item) {
      return sum + (installTime * qty);
    }
    
    return sum;
  }, 0);
  
  // ============================================================================
  // STEP 2: CALCULATE WORK DAYS
  // ============================================================================
  
  // If no labor hours, return all zeros
  if (totalLaborHours === 0) {
    return {
      totalLaborHours: 0,
      workDays: 0,
      calendarDays: 0,
      travelDays: 0,
      totalCalendarDays: 0,
      nights: 0,
      hotelRooms: 0,
      perDiemDays: 0,
      breakdown: {
        step1_laborHours: 0,
        step2_rawWorkDays: 0,
        step3_roundedWorkDays: 0,
        step4_calendarDays: 0,
        step5_travelDays: 0,
        step6_totalDays: 0,
        step7_nights: 0,
        step8_roomsPerNight: 0,
        step9_hotelRooms: 0,
        step10_perDiem: 0
      }
    };
  }
  
  // Work days = total hours / (hours per day × techs)
  const rawWorkDays = totalLaborHours / (hoursPerDay * techs);
  
  // Round to nearest 0.5 day
  const workDays = roundToHalfDay(rawWorkDays);
  
  // ============================================================================
  // STEP 3: CONVERT TO CALENDAR DAYS
  // ============================================================================
  
  const calendarDays = convertWorkDaysToCalendarDays(workDays);
  
  // ============================================================================
  // STEP 4: ADD TRAVEL DAYS
  // ============================================================================
  
  // If one-way travel > 4 hours, add 2 full travel days (round trip)
  const travelDays = (travelEnabled && travelHours > 4) ? 2 : 0;
  
  const totalCalendarDays = calendarDays + travelDays;
  
  // ============================================================================
  // STEP 5: CALCULATE NIGHTS
  // ============================================================================
  
  // Nights = total days - 1 (check out on last day)
  // Cannot be negative
  const nights = Math.max(totalCalendarDays - 1, 0);
  
  // ============================================================================
  // STEP 6: CALCULATE HOTEL ROOMS
  // ============================================================================
  
  // Default: 2 techs per room
  const defaultRoomsPerNight = Math.ceil(techs / 2);
  
  // Use manual override if provided, otherwise use calculated value
  const effectiveRoomsPerNight = roomsPerNight !== null && roomsPerNight !== undefined
    ? roomsPerNight
    : defaultRoomsPerNight;
  
  // Total hotel room-nights = rooms per night × nights
  const hotelRooms = effectiveRoomsPerNight * nights;
  
  // ============================================================================
  // STEP 7: CALCULATE PER DIEM
  // ============================================================================
  
  // Per diem = techs × total calendar days
  const perDiemDays = techs * totalCalendarDays;
  
  // ============================================================================
  // STEP 8: RETURN COMPLETE RESULT
  // ============================================================================
  
  return {
    // Main outputs
    totalLaborHours,
    workDays,
    calendarDays,
    travelDays,
    totalCalendarDays,
    nights,
    hotelRooms,
    perDiemDays,
    
    // Detailed breakdown for debugging and display
    breakdown: {
      step1_laborHours: totalLaborHours,
      step2_rawWorkDays: rawWorkDays,
      step3_roundedWorkDays: workDays,
      step4_calendarDays: calendarDays,
      step5_travelDays: travelDays,
      step6_totalDays: totalCalendarDays,
      step7_nights: nights,
      step8_roomsPerNight: effectiveRoomsPerNight,
      step9_hotelRooms: hotelRooms,
      step10_perDiem: perDiemDays
    }
  };
}

/**
 * ============================================================================
 * HELPER: Get derived quantity for a specific calculation type
 * ============================================================================
 * 
 * Use this to get the quantity for auto-calculated items (hotel, per_diem)
 * 
 * @param {Object} result - Result from computeQuoteDerived
 * @param {string} calculationType - 'hotel' or 'per_diem'
 * @returns {number} - Derived quantity
 */
export function getDerivedQuantity(result, calculationType) {
  switch (calculationType) {
    case 'hotel':
      return result.hotelRooms;
    case 'per_diem':
      return result.perDiemDays;
    default:
      return 0;
  }
}

/**
 * ============================================================================
 * HELPER: Check if an item should use derived calculation
 * ============================================================================
 * 
 * @param {Object} item - Line item
 * @returns {boolean}
 */
export function isAutoCalculatedItem(item) {
  return item.auto_calculated === true && !item.manual_override;
}