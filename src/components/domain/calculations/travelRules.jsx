/**
 * TRAVEL RULES - Pure business logic
 * Determines travel requirements based on distance and driving time
 */

/**
 * Determine if travel days are needed based on driving hours
 * @param {number} drivingHours - One-way driving hours
 * @returns {boolean} - True if >4 hours (needs travel days)
 */
export function needsTravelDays(drivingHours) {
  return drivingHours > 4;
}

/**
 * Calculate travel days needed
 * @param {number} drivingHours - One-way driving hours
 * @returns {number} - Travel days (0 if <4h, 2 if >4h - one before, one after)
 */
export function calculateTravelDays(drivingHours) {
  return needsTravelDays(drivingHours) ? 2 : 0;
}

/**
 * Calculate driving time item for quote
 * @param {number} drivingHours - One-way driving hours per team
 * @param {number} teams - Number of teams
 * @param {number} ratePerHour - Hourly rate for driving (default 25)
 * @returns {Object} - Quote item for driving time
 */
export function calculateDrivingTimeItem(drivingHours, teams, ratePerHour = 25) {
  if (drivingHours <= 0 || teams <= 0) return null;
  
  // Round trip = 2x one-way
  const roundTripHours = drivingHours * 2;
  const totalHours = roundTripHours * teams;
  const totalCost = totalHours * ratePerHour;
  
  return {
    item_name: 'Driving Time',
    description: `${teams} team${teams > 1 ? 's' : ''} × ${roundTripHours.toFixed(1)}h round trip @ $${ratePerHour}/h`,
    quantity: totalHours,
    unit: 'hours',
    unit_price: ratePerHour,
    total: totalCost,
    category: 'labor',
    calculation_type: 'driving'
  };
}

/**
 * Calculate mileage reimbursement item for quote
 * @param {number} miles - One-way miles per team
 * @param {number} teams - Number of teams
 * @param {number} vehicles - Number of vehicles total
 * @param {number} ratePerMile - Reimbursement rate per mile (default 0.70)
 * @returns {Object} - Quote item for mileage
 */
export function calculateMileageItem(miles, teams, vehicles, ratePerMile = 0.70) {
  if (miles <= 0 || vehicles <= 0) return null;
  
  // Round trip = 2x one-way
  const roundTripMiles = miles * 2;
  const totalMiles = roundTripMiles * vehicles;
  const totalCost = totalMiles * ratePerMile;
  
  return {
    item_name: 'Mileage Reimbursement',
    description: `${vehicles} vehicle${vehicles > 1 ? 's' : ''} × ${roundTripMiles.toFixed(0)} miles round trip @ $${ratePerMile}/mile`,
    quantity: totalMiles,
    unit: 'miles',
    unit_price: ratePerMile,
    total: totalCost,
    category: 'travel',
    calculation_type: 'mileage'
  };
}

/**
 * Calculate complete travel breakdown
 * @param {number} drivingHours - One-way driving hours
 * @param {number} miles - One-way miles
 * @param {number} teams - Number of teams
 * @param {number} vehicles - Number of vehicles
 * @param {Object} rates - { drivingRate, mileageRate }
 * @returns {Object} - { needsTravelDays, travelDays, drivingItem, mileageItem }
 */
export function calculateTravelBreakdown(drivingHours, miles, teams, vehicles, rates = {}) {
  const {
    drivingRate = 25,
    mileageRate = 0.70
  } = rates;
  
  const hasTravelDays = needsTravelDays(drivingHours);
  const travelDays = calculateTravelDays(drivingHours);
  const drivingItem = calculateDrivingTimeItem(drivingHours, teams, drivingRate);
  const mileageItem = calculateMileageItem(miles, teams, vehicles, mileageRate);
  
  return {
    needsTravelDays: hasTravelDays,
    travelDays,
    drivingItem,
    mileageItem
  };
}

/**
 * Determine if location is "out of area" (requires travel compensation)
 * @param {number} drivingHours - One-way driving hours
 * @param {number} miles - One-way miles
 * @returns {boolean} - True if out of area (>2h or >100 miles)
 */
export function isOutOfArea(drivingHours, miles) {
  return drivingHours > 2 || miles > 100;
}