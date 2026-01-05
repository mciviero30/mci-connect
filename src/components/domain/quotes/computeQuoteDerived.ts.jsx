/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH - QUOTE DERIVED CALCULATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️  CRITICAL: This is the ONLY place where quote-derived calculations are allowed.
 * ⚠️  All other files MUST import and use this function.
 * ⚠️  DO NOT duplicate this logic anywhere else in the codebase.
 * 
 * Purpose:
 * - Calculate project duration from installation hours
 * - Calculate hotel rooms needed
 * - Calculate per diem days
 * - Calculate travel days if applicable
 * 
 * This function is 100% PURE:
 * - No mutations
 * - No side effects
 * - No reading from external state
 * - Deterministic (same input = same output)
 * 
 * Created: 2026-01-05
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Line item with installation time
 */
export interface QuoteItem {
  installation_time?: number;
  quantity?: number;
  is_travel_item?: boolean;
  calculation_type?: string;
}

/**
 * Travel configuration
 */
export interface TravelConfig {
  enabled: boolean;
  hours: number; // One-way travel time in hours
}

/**
 * Calendar configuration
 */
export interface CalendarConfig {
  hoursPerDay: number; // Productive hours per day (default: 8)
  workDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (default: [1,2,3,4,5])
}

/**
 * Input parameters for derived calculations
 */
export interface QuoteDerivedInput {
  items: QuoteItem[];
  techs: number;
  travel?: TravelConfig;
  calendar?: CalendarConfig;
  roomsPerNight?: number; // Rooms per night (default: ceil(techs/2))
}

/**
 * Complete derived calculations result
 */
export interface QuoteDerivedResult {
  // Raw calculations
  totalLaborHours: number;
  dailyCapacity: number; // techs * hoursPerDay
  workDays: number; // Rounded to nearest 0.5
  
  // Calendar calculations
  calendarDays: number; // Including weekends
  weekends: number; // Number of weekend days
  
  // Travel calculations
  travelDays: number; // Days added for travel (0 if no travel)
  totalCalendarDays: number; // workDays converted to calendar + travel
  
  // Accommodation calculations
  totalNights: number; // nights to stay
  roomsPerNight: number; // rooms needed per night
  totalHotelRooms: number; // total room-nights
  
  // Per diem calculations
  perDiemDays: number; // techs * totalCalendarDays
  totalPerDiem: number; // Same as perDiemDays (for backwards compatibility)
  
  // Summary flags
  hasLaborHours: boolean;
  requiresTravel: boolean;
  suggestedRooms: number; // Suggested rooms per night
}

/**
 * Default calendar: Monday-Friday, 8 hours/day
 */
const DEFAULT_CALENDAR: CalendarConfig = {
  hoursPerDay: 8,
  workDays: [1, 2, 3, 4, 5] // Mon-Fri
};

/**
 * Compute all derived values for a quote
 * 
 * @param input - Quote items, techs, travel config, calendar config
 * @returns Complete set of derived calculations
 */
export function computeQuoteDerived(input: QuoteDerivedInput): QuoteDerivedResult {
  const {
    items = [],
    techs = 2,
    travel = { enabled: false, hours: 0 },
    calendar = DEFAULT_CALENDAR,
    roomsPerNight: inputRoomsPerNight
  } = input;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Calculate total labor hours
  // ═══════════════════════════════════════════════════════════════════════
  const totalLaborHours = items
    .filter(item => !item.is_travel_item && !item.calculation_type)
    .reduce((sum, item) => {
      const hours = Number(item.installation_time) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (hours * qty);
    }, 0);

  // If no labor hours, return zero state
  if (totalLaborHours === 0) {
    return {
      totalLaborHours: 0,
      dailyCapacity: 0,
      workDays: 0,
      calendarDays: 0,
      weekends: 0,
      travelDays: 0,
      totalCalendarDays: 0,
      totalNights: 0,
      roomsPerNight: 0,
      totalHotelRooms: 0,
      perDiemDays: 0,
      totalPerDiem: 0,
      hasLaborHours: false,
      requiresTravel: false,
      suggestedRooms: Math.ceil(techs / 2)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Calculate work days (rounded to nearest 0.5)
  // ═══════════════════════════════════════════════════════════════════════
  const dailyCapacity = techs * calendar.hoursPerDay;
  const rawWorkDays = totalLaborHours / dailyCapacity;
  const workDays = Math.round(rawWorkDays * 2) / 2; // Round to nearest 0.5

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Convert work days to calendar days (including weekends)
  // ═══════════════════════════════════════════════════════════════════════
  const { calendarDays, weekends } = convertWorkDaysToCalendarDays(workDays, calendar.workDays);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Calculate travel days (if enabled and > 4 hours one-way)
  // ═══════════════════════════════════════════════════════════════════════
  const requiresTravel = travel.enabled && travel.hours > 4;
  const travelDays = requiresTravel ? 2 : 0; // Round trip: 1 day out + 1 day back

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Calculate total calendar days (work + travel)
  // ═══════════════════════════════════════════════════════════════════════
  const totalCalendarDays = calendarDays + travelDays;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Calculate nights (stay duration)
  // ═══════════════════════════════════════════════════════════════════════
  const totalNights = Math.max(totalCalendarDays - 1, 0);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Calculate hotel rooms
  // ═══════════════════════════════════════════════════════════════════════
  const suggestedRooms = Math.ceil(techs / 2); // 2 techs per room
  const finalRoomsPerNight = inputRoomsPerNight !== undefined ? inputRoomsPerNight : suggestedRooms;
  const totalHotelRooms = finalRoomsPerNight * totalNights;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 8: Calculate per diem
  // ═══════════════════════════════════════════════════════════════════════
  const perDiemDays = techs * totalCalendarDays;

  // ═══════════════════════════════════════════════════════════════════════
  // RETURN: Complete derived result
  // ═══════════════════════════════════════════════════════════════════════
  return {
    totalLaborHours,
    dailyCapacity,
    workDays,
    calendarDays,
    weekends,
    travelDays,
    totalCalendarDays,
    totalNights,
    roomsPerNight: finalRoomsPerNight,
    totalHotelRooms,
    perDiemDays,
    totalPerDiem: perDiemDays, // Backwards compatibility
    hasLaborHours: true,
    requiresTravel,
    suggestedRooms
  };
}

/**
 * Convert work days to calendar days (accounting for weekends)
 * 
 * Algorithm:
 * - Start on Monday (day 1)
 * - For each work day, advance the calendar
 * - Skip weekend days (not in workDays array)
 * - Count total calendar days elapsed
 * 
 * @param workDays - Number of work days
 * @param workDaysArray - Array of valid work days (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns { calendarDays, weekends }
 */
function convertWorkDaysToCalendarDays(
  workDays: number,
  workDaysArray: number[] = [1, 2, 3, 4, 5]
): { calendarDays: number; weekends: number } {
  if (workDays === 0) {
    return { calendarDays: 0, weekends: 0 };
  }

  let currentDay = 1; // Start on Monday
  let workDaysCompleted = 0;
  let calendarDaysElapsed = 0;
  let weekendsEncountered = 0;

  // Simulate day-by-day progression
  while (workDaysCompleted < workDays) {
    calendarDaysElapsed++;

    if (workDaysArray.includes(currentDay)) {
      // It's a work day
      workDaysCompleted++;
    } else {
      // It's a weekend
      weekendsEncountered++;
    }

    // Advance to next day (wrap around week)
    currentDay = (currentDay + 1) % 7;
  }

  return {
    calendarDays: calendarDaysElapsed,
    weekends: weekendsEncountered
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Example 1: Basic calculation
 * ------------------------------
 * const result = computeQuoteDerived({
 *   items: [
 *     { installation_time: 2, quantity: 10 }, // 20 hours
 *     { installation_time: 1, quantity: 5 }   // 5 hours
 *   ],
 *   techs: 2
 * });
 * // result.totalLaborHours = 25
 * // result.workDays = 1.5 (rounded from 1.5625)
 * // result.calendarDays = 2
 * // result.totalHotelRooms = 2 (1 room * 1 night)
 * // result.totalPerDiem = 4 (2 techs * 2 days)
 * 
 * 
 * Example 2: With travel
 * ------------------------------
 * const result = computeQuoteDerived({
 *   items: [{ installation_time: 8, quantity: 10 }], // 80 hours
 *   techs: 4,
 *   travel: { enabled: true, hours: 5 }
 * });
 * // result.travelDays = 2 (round trip)
 * // result.totalCalendarDays = 7 (5 work days + 2 travel days)
 * // result.totalHotelRooms = 12 (2 rooms * 6 nights)
 * 
 * 
 * Example 3: Custom calendar
 * ------------------------------
 * const result = computeQuoteDerived({
 *   items: [{ installation_time: 10, quantity: 8 }], // 80 hours
 *   techs: 2,
 *   calendar: { hoursPerDay: 10, workDays: [1,2,3,4,5,6] } // 6-day week
 * });
 * // result.workDays = 4 (80 / (2*10))
 * // result.weekends = 0 (working Saturdays)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */