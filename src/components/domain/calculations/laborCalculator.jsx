/**
 * LABOR CALCULATION ENGINE
 * Pure functions for calculating labor hours and work days
 * NO React, NO side effects - 100% deterministic
 */

/**
 * Sum total labor hours from quote items (excludes travel items)
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
 * Work days are Monday-Friday, 8 hours per day
 * @param {number} totalLaborHours - Total labor hours
 * @param {number} techCount - Number of technicians
 * @returns {number} - Work days (rounded to nearest 0.5)
 */
export function calculateWorkDays(totalLaborHours, techCount = 1) {
  const hoursPerDay = 8;
  const dailyCapacity = hoursPerDay * techCount;
  
  if (totalLaborHours === 0 || dailyCapacity === 0) return 0;
  
  const workDays = totalLaborHours / dailyCapacity;
  
  // Round to nearest 0.5 day
  return Math.round(workDays * 2) / 2;
}

/**
 * Calculate daily and weekly capacity
 * @param {number} techCount - Number of technicians
 * @returns {Object} - { dailyCapacity, weeklyCapacity }
 */
export function calculateCapacity(techCount = 1) {
  const hoursPerDay = 8;
  const workDaysPerWeek = 5;
  
  return {
    dailyCapacity: hoursPerDay * techCount,
    weeklyCapacity: hoursPerDay * techCount * workDaysPerWeek
  };
}