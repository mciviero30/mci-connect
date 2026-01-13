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
 * WHY HOTEL ROOMS AND PER DIEM ARE NOT EDITABLE:
 * ============================================================================
 * 
 * These values are DERIVED from project parameters to prevent estimation errors.
 * 
 * Manual editing would create:
 * - Inconsistencies between project duration and stay costs
 * - Estimation errors (forgetting to update when items change)
 * - Data integrity issues (values frozen in time)
 * - Financial discrepancies (quoted cost vs actual need)
 * 
 * WHAT INPUTS AFFECT THE CALCULATION:
 * - items with installation_time (labor hours)
 * - number of technicians
 * - hours per work day (default: 8)
 * - travel time (if > 4 hours one-way, adds 2 travel days)
 * - rooms per night (default: ceil(techs / 2), can be overridden)
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
 *    - ALWAYS round UP to full day (even 3 hours = 1 full day)
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
 *    - nights = ceil(max(calendarDays - 1, 0))
 *    - ALWAYS round UP to full night (even 3 hours = 1 full night)
 *    - Cannot be negative
 * 
 * 6. HOTEL ROOMS
 *    - 2 techs per room (default)
 *    - Formula: hotelRooms = roomsPerNight × nights
 * 
 * 7. PER DIEM
 *    - One per diem per tech per calendar day
 *    - Formula: perDiemDays = techs × calendarDays
 * 
 * ============================================================================
 */

/**
 * ============================================================================
 * TYPE DEFINITIONS (CAPA 2 - INPUT CANÓNICO)
 * ============================================================================
 */

/**
 * @typedef {Object} QuoteItem
 * @property {string} item_name - Item name
 * @property {number} quantity - Quantity
 * @property {number} installation_time - Installation time in hours
 * @property {boolean} [is_travel_item] - Whether this is a travel item
 */

/**
 * @typedef {Object} TravelConfig
 * @property {boolean} enabled - Whether travel is required
 * @property {number} hours - One-way travel time in hours
 */

/**
 * @typedef {Object} CalendarConfig
 * @property {number} hoursPerDay - Work hours per day (default: 8)
 * @property {number[]} workDays - Work days of week [1,2,3,4,5] = Mon-Fri
 */

/**
 * @typedef {Object} QuoteComputeInput
 * @property {QuoteItem[]} items - Quote items with installation times
 * @property {number} techs - Number of technicians (must be > 0)
 * @property {TravelConfig} travel - Travel configuration
 * @property {CalendarConfig} calendar - Calendar configuration
 * @property {number|null} [roomsPerNight] - Optional manual override for rooms per night
 */

/**
 * @typedef {Object} QuoteDerivedBreakdown
 * @property {number} step1_laborHours - Total installation hours
 * @property {number} step2_rawWorkDays - Work days before rounding
 * @property {number} step3_roundedWorkDays - Work days rounded to 0.5
 * @property {number} step4_calendarDays - Calendar days (Mon-Sun)
 * @property {number} step5_travelDays - Additional travel days (0 or 2)
 * @property {number} step6_totalDays - Total calendar days including travel
 * @property {number} step7_nights - Nights required (totalDays - 1)
 * @property {number} step8_roomsPerNight - Rooms per night
 * @property {number} step9_hotelRooms - Total hotel room-nights
 * @property {number} step10_perDiem - Total per diem days
 */

/**
 * @typedef {Object} QuoteDerived
 * @property {number} totalLaborHours - Total installation hours
 * @property {number} workDays - Work days (Mon-Fri) rounded to 0.5
 * @property {number} calendarDays - Calendar days (excluding travel)
 * @property {number} travelDays - Travel days (0 or 2)
 * @property {number} totalCalendarDays - Total calendar days (including travel)
 * @property {number} nights - Total nights stay
 * @property {number} hotelRooms - Total hotel room-nights
 * @property {number} perDiemDays - Total per diem days (techs × totalDays)
 * @property {QuoteDerivedBreakdown} breakdown - Detailed calculation breakdown
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
 * ============================================================================
 * MAIN COMPUTATION FUNCTION (CAPA 2 - INPUT CANÓNICO)
 * ============================================================================
 * 
 * Computes ALL derived values for a quote in a single pass.
 * This function is 100% pure - no mutations, no side effects, no external dependencies.
 * 
 * ⚠️ ANTI DATOS FANTASMA:
 * - NO optional defaults in params
 * - ALL inputs MUST be explicitly provided
 * - NO implicit inferences from context
 * 
 * @param {QuoteComputeInput} params - Input parameters (STRICT CONTRACT)
 * @returns {QuoteDerived} - Derived values (STRICT OUTPUT)
 */
export function computeQuoteDerived(params) {
  // ============================================================================
  // STEP 0: VALIDATE AND NORMALIZE INPUTS (CAPA 5 - GUARDAS DURAS)
  // ============================================================================
  
  const {
    items,
    techs,
    travel,
    calendar,
    roomsPerNight = null
  } = params;
  
  // HARD GUARD: Reject invalid inputs
  if (!Array.isArray(items)) {
    throw new Error('[computeQuoteDerived] items must be an array');
  }
  
  if (typeof techs !== 'number' || techs <= 0) {
    throw new Error('[computeQuoteDerived] techs must be a positive number');
  }
  
  if (!travel || typeof travel !== 'object') {
    throw new Error('[computeQuoteDerived] travel config is required');
  }
  
  if (!calendar || typeof calendar !== 'object') {
    throw new Error('[computeQuoteDerived] calendar config is required');
  }
  
  const hoursPerDay = calendar.hoursPerDay;
  const travelEnabled = travel.enabled;
  const travelHours = travel.hours;
  
  // HARD GUARD: Validate calendar config
  if (typeof hoursPerDay !== 'number' || hoursPerDay <= 0) {
    throw new Error('[computeQuoteDerived] calendar.hoursPerDay must be a positive number');
  }
  
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
  // STEP 2: CALCULATE WORK DAYS (CAPA 5 - EDGE CASE: ZERO HOURS)
  // ============================================================================
  
  // HARD GUARD: If no labor hours OR invalid techs, return ZERO_DERIVED
  if (totalLaborHours <= 0 || techs <= 0) {
    const ZERO_DERIVED = {
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
    return ZERO_DERIVED;
  }
  
  // Work days = total hours / (hours per day × techs)
  const rawWorkDays = totalLaborHours / (hoursPerDay * techs);
  
  // HARD GUARD: Prevent NaN
  if (isNaN(rawWorkDays) || !isFinite(rawWorkDays)) {
    throw new Error('[computeQuoteDerived] Invalid work days calculation - check inputs');
  }
  
  // Round UP to nearest full day (ALWAYS charge full days)
  const workDays = Math.ceil(rawWorkDays);
  
  // HARD GUARD: Prevent negative work days
  if (workDays < 0) {
    throw new Error('[computeQuoteDerived] Work days cannot be negative');
  }
  
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
  // STEP 5: CALCULATE NIGHTS (ALWAYS ROUND UP TO FULL NIGHTS)
  // ============================================================================
  
  // Nights = total days - 1 (check out on last day)
  // ALWAYS round up - even 3 hours = 1 full night
  const nights = Math.max(Math.ceil(totalCalendarDays - 1), 0);
  
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
  // STEP 8: RETURN COMPLETE RESULT (CAPA 5 - FINAL GUARDS)
  // ============================================================================
  
  // HARD GUARD: Ensure no NaN, undefined, or negative values in output
  const result = {
    // Main outputs
    totalLaborHours: Number(totalLaborHours) || 0,
    workDays: Number(workDays) || 0,
    calendarDays: Number(calendarDays) || 0,
    travelDays: Number(travelDays) || 0,
    totalCalendarDays: Number(totalCalendarDays) || 0,
    nights: Number(nights) || 0,
    hotelRooms: Number(hotelRooms) || 0,
    perDiemDays: Number(perDiemDays) || 0,
    
    // Detailed breakdown for debugging and display
    breakdown: {
      step1_laborHours: Number(totalLaborHours) || 0,
      step2_rawWorkDays: Number(rawWorkDays) || 0,
      step3_roundedWorkDays: Number(workDays) || 0,
      step4_calendarDays: Number(calendarDays) || 0,
      step5_travelDays: Number(travelDays) || 0,
      step6_totalDays: Number(totalCalendarDays) || 0,
      step7_nights: Number(nights) || 0,
      step8_roomsPerNight: Number(effectiveRoomsPerNight) || 0,
      step9_hotelRooms: Number(hotelRooms) || 0,
      step10_perDiem: Number(perDiemDays) || 0
    }
  };
  
  // HARD GUARD: Validate no negative values in result
  for (const key in result) {
    if (typeof result[key] === 'number' && result[key] < 0) {
      throw new Error(`[computeQuoteDerived] Negative value detected: ${key} = ${result[key]}`);
    }
  }
  
  return result;
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
 * ⚠️ WARNING (CAPA 8 - ANTI FUTURO DEV):
 * DO NOT manually set quantities for auto-calculated items.
 * These values MUST always be derived from computeQuoteDerived.
 * 
 * @param {Object} item - Line item
 * @returns {boolean}
 */
export function isAutoCalculatedItem(item) {
  return item.auto_calculated === true && !item.manual_override;
}

/**
 * ============================================================================
 * HELPER: Create canonical input for computeQuoteDerived (CAPA 2)
 * ============================================================================
 * 
 * Factory function to ensure all required fields are present.
 * Prevents implicit defaults and ghost data.
 * 
 * @param {Object} params - Raw parameters
 * @returns {QuoteComputeInput} - Canonical input
 */
export function createComputeInput(params) {
  const {
    items,
    techs,
    travelEnabled = false,
    travelHours = 0,
    hoursPerDay = 8,
    roomsPerNight = null
  } = params;
  
  // Validate required fields
  if (!items) throw new Error('items is required');
  if (!techs) throw new Error('techs is required');
  
  return {
    items,
    techs,
    travel: {
      enabled: Boolean(travelEnabled),
      hours: Number(travelHours) || 0
    },
    calendar: {
      hoursPerDay: Number(hoursPerDay) || 8,
      workDays: [1, 2, 3, 4, 5] // Mon-Fri fixed
    },
    roomsPerNight
  };
}