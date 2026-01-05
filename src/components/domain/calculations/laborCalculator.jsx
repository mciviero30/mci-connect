/**
 * LABOR CALCULATOR - Pure calculation logic
 * Calculates labor hours, installation time, and technician requirements
 */

/**
 * Calculate total installation labor hours from quote items
 * @param {Array} items - Quote items with installation_time and quantity
 * @returns {number} - Total labor hours
 */
export function calculateTotalLaborHours(items = []) {
  if (!Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    const installTime = parseFloat(item.installation_time) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    return total + (installTime * quantity);
  }, 0);
}

/**
 * Calculate labor hours by category
 * @param {Array} items - Quote items
 * @returns {Object} - { installation: number, driving: number, setup: number, total: number }
 */
export function calculateLaborHoursByCategory(items = []) {
  const categories = {
    installation: 0,
    driving: 0,
    setup: 0,
    cleanup: 0
  };

  items.forEach(item => {
    const hours = (parseFloat(item.installation_time) || 0) * (parseFloat(item.quantity) || 0);
    const category = item.category || 'installation';
    
    if (categories.hasOwnProperty(category)) {
      categories[category] += hours;
    } else {
      categories.installation += hours;
    }
  });

  categories.total = Object.values(categories).reduce((sum, hours) => sum + hours, 0);
  
  return categories;
}

/**
 * Calculate minimum technicians required based on labor hours and duration
 * @param {number} totalLaborHours - Total installation hours
 * @param {number} workDays - Number of work days available
 * @param {number} hoursPerDay - Work hours per day (default 8)
 * @returns {number} - Minimum technicians needed (rounded up)
 */
export function calculateMinimumTechnicians(totalLaborHours, workDays, hoursPerDay = 8) {
  if (workDays <= 0 || hoursPerDay <= 0) return 0;
  
  const availableHours = workDays * hoursPerDay;
  const techsNeeded = totalLaborHours / availableHours;
  
  return Math.ceil(techsNeeded);
}