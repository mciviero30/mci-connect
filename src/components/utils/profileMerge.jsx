/**
 * PROFILE MERGE UTILITIES
 * Safe merge helpers to prevent data loss during PendingEmployee → User migration
 */

/**
 * Normalize email to lowercase + trim
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Merge non-empty values from source to target
 * Never overwrites existing good data with empty/null/undefined
 */
export function mergeNonEmpty(target, source) {
  if (!source) return target;
  if (!target) return source;
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    // Only merge if source has a real value
    if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
      // If target is empty/null/undefined, take source
      if (targetValue === null || targetValue === undefined || targetValue === '') {
        result[key] = sourceValue;
      }
      // If target has value, keep target (don't overwrite)
      // Exception: allow explicit updates
      else if (key === 'employment_status' || key === 'onboarding_completed') {
        result[key] = sourceValue;
      }
    }
  });
  
  return result;
}

/**
 * Build full_name from available data
 * Priority: full_name (if valid) → first+last → email fallback (display only)
 */
export function buildFullName(record) {
  if (!record) return '';
  
  // Priority 1: Existing full_name (if not email-like)
  if (record.full_name && 
      !record.full_name.includes('@') && 
      record.full_name.trim().length > 2) {
    return record.full_name.trim();
  }
  
  // Priority 2: first_name + last_name
  if (record.first_name || record.last_name) {
    return `${record.first_name || ''} ${record.last_name || ''}`.trim();
  }
  
  // Priority 3: Extract from email (DISPLAY ONLY - don't persist)
  if (record.email) {
    const localPart = record.email.split('@')[0];
    const parts = localPart.split('.');
    return parts.map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join(' ');
  }
  
  return '';
}

/**
 * Migrate PendingEmployee data to User safely
 * Returns object ready for base44.auth.updateMe()
 */
export function migratePendingToUser(currentUser, pendingEmployee) {
  if (!pendingEmployee) return {};
  
  const migration = {};
  
  // Name fields
  if (pendingEmployee.first_name) migration.first_name = pendingEmployee.first_name;
  if (pendingEmployee.last_name) migration.last_name = pendingEmployee.last_name;
  
  // Build full_name ONLY if we have real name data
  if (pendingEmployee.first_name || pendingEmployee.last_name) {
    migration.full_name = buildFullName(pendingEmployee);
  } else if (pendingEmployee.full_name && !pendingEmployee.full_name.includes('@')) {
    migration.full_name = pendingEmployee.full_name;
  }
  
  // Contact info
  if (pendingEmployee.phone) migration.phone = pendingEmployee.phone;
  if (pendingEmployee.address) migration.address = pendingEmployee.address;
  
  // Position/org
  if (pendingEmployee.position) migration.position = pendingEmployee.position;
  if (pendingEmployee.department) migration.department = pendingEmployee.department;
  if (pendingEmployee.team_id) migration.team_id = pendingEmployee.team_id;
  if (pendingEmployee.team_name) migration.team_name = pendingEmployee.team_name;
  
  // Personal data
  if (pendingEmployee.dob) migration.dob = pendingEmployee.dob;
  if (pendingEmployee.ssn_tax_id) migration.ssn_tax_id = pendingEmployee.ssn_tax_id;
  if (pendingEmployee.tshirt_size) migration.tshirt_size = pendingEmployee.tshirt_size;
  
  // Payroll
  if (pendingEmployee.hourly_rate) migration.hourly_rate = pendingEmployee.hourly_rate;
  if (pendingEmployee.hire_date) migration.hire_date = pendingEmployee.hire_date;
  
  // Safe merge with existing auth user data
  return mergeNonEmpty(currentUser, migration);
}