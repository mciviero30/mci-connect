/**
 * TRAVEL RULES & CONSTANTS
 * Pure functions and constants for travel calculations
 * NO React, NO side effects - 100% deterministic
 */

/**
 * TRAVEL CONSTANTS
 */
export const TRAVEL_CONSTANTS = {
  MILEAGE_RATE: 0.70,              // Rate per mile ($0.70)
  DEFAULT_DRIVING_HOURLY_RATE: 25, // Hourly rate for driving time
  HOTEL_DEFAULT_RATE: 200,         // Default hotel room rate per night
  PER_DIEM_DEFAULT_RATE: 55,       // Default per diem rate per day
  MILEAGE_BUFFER: 1.10,            // 10% buffer for mileage calculations
  LONG_TRAVEL_THRESHOLD_HOURS: 4, // Threshold for adding extra travel days
};

/**
 * Calculate travel days based on travel time
 * @param {number} travelTimeHours - One-way travel time in hours
 * @returns {Object} - { baseTravelDays, extraTravelDays, totalTravelDays }
 */
export function calculateTravelDays(travelTimeHours = 0) {
  const baseTravelDays = 2; // Standard: arrive Sunday, leave after last work day
  
  // Add extra days if travel time > 4 hours
  const extraTravelDays = travelTimeHours > TRAVEL_CONSTANTS.LONG_TRAVEL_THRESHOLD_HOURS ? 2 : 0;
  
  return {
    baseTravelDays,
    extraTravelDays,
    totalTravelDays: baseTravelDays + extraTravelDays
  };
}

/**
 * Calculate total mileage with buffer
 * @param {number} oneWayMiles - One-way distance in miles
 * @returns {number} - Total miles (round trip + 10% buffer)
 */
export function calculateTotalMiles(oneWayMiles) {
  if (!oneWayMiles || oneWayMiles <= 0) return 0;
  
  const roundTripMiles = oneWayMiles * 2;
  const totalMiles = roundTripMiles * TRAVEL_CONSTANTS.MILEAGE_BUFFER;
  
  return Math.round(totalMiles);
}

/**
 * Calculate driving hours with buffer and rounding
 * @param {number} oneWayHours - One-way driving time in hours
 * @returns {number} - Rounded driving hours (round trip + buffer)
 */
export function calculateDrivingHours(oneWayHours) {
  if (!oneWayHours || oneWayHours <= 0) return 0;
  
  const roundTripHours = oneWayHours * 2;
  const hoursWithBuffer = roundTripHours * TRAVEL_CONSTANTS.MILEAGE_BUFFER;
  
  // Custom rounding: if decimal < 0.5, round to .5, else round up to next integer
  const integer = Math.floor(hoursWithBuffer);
  const decimal = hoursWithBuffer - integer;
  
  if (decimal < 0.5) {
    return integer + 0.5;
  } else {
    return integer + 1;
  }
}

/**
 * Calculate mileage cost
 * @param {number} totalMiles - Total miles
 * @param {number} vehicleCount - Number of vehicles (default: 1)
 * @returns {number} - Total mileage cost
 */
export function calculateMileageCost(totalMiles, vehicleCount = 1) {
  return totalMiles * vehicleCount * TRAVEL_CONSTANTS.MILEAGE_RATE;
}

/**
 * Calculate driving time cost
 * @param {number} drivingHours - Total driving hours
 * @param {number} techCount - Number of technicians (default: 1)
 * @param {number} hourlyRate - Hourly rate (default: $25)
 * @returns {number} - Total driving time cost
 */
export function calculateDrivingCost(drivingHours, techCount = 1, hourlyRate = TRAVEL_CONSTANTS.DEFAULT_DRIVING_HOURLY_RATE) {
  return drivingHours * techCount * hourlyRate;
}