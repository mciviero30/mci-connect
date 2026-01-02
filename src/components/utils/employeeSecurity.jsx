/**
 * Employee Data Security Helpers
 * Controls access to sensitive employee information (DOB, SSN)
 */

/**
 * Determines if user can view/edit sensitive employee data (DOB, SSN)
 * @param {Object} user - Current authenticated user (merged profile)
 * @returns {boolean} - True if user has permission
 */
export const canViewSensitiveEmployeeData = (user) => {
  if (!user) return false;
  
  // GUARD: Only Admin and CEO roles can view DOB/SSN
  const role = (user.role || '').toLowerCase();
  return role === 'admin' || role === 'ceo';
};

// Alias for consistency
export const canViewSensitiveData = canViewSensitiveEmployeeData;

/**
 * Checks if user has full admin access (Admin or CEO)
 * @param {Object} user - Current authenticated user (merged profile)
 * @returns {boolean}
 */
export const hasFullAccess = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'admin' || role === 'ceo';
};

/**
 * Masks SSN/Tax ID for display
 * @param {string} ssn - Full SSN (e.g., "123-45-6789")
 * @returns {string} - Masked SSN (e.g., "***-**-6789")
 */
export const maskSSN = (ssn) => {
  if (!ssn) return '';
  
  // Remove any formatting
  const cleaned = ssn.replace(/\D/g, '');
  
  if (cleaned.length === 9) {
    // Format: ***-**-1234
    return `***-**-${cleaned.slice(-4)}`;
  }
  
  // If not standard 9 digits, mask all but last 4 chars
  if (ssn.length > 4) {
    return '*'.repeat(ssn.length - 4) + ssn.slice(-4);
  }
  
  return '****';
};

/**
 * Gets display value for sensitive field based on permissions
 * @param {string} value - Original value
 * @param {Object} user - Current user
 * @param {string} fieldType - 'ssn' or 'dob'
 * @returns {string} - Display value (masked or full)
 */
export const getSensitiveFieldDisplay = (value, user, fieldType = 'ssn') => {
  if (!value) return '';
  
  const canView = canViewSensitiveEmployeeData(user);
  
  if (canView) {
    return value;
  }
  
  if (fieldType === 'ssn') {
    return maskSSN(value);
  }
  
  // For DOB, hide completely for non-authorized users
  if (fieldType === 'dob') {
    return '[RESTRICTED]';
  }
  
  return value;
};

/**
 * Validates if user can update sensitive employee fields
 * @param {Object} user - Current user
 * @param {Object} updates - Proposed updates
 * @returns {Object} - { allowed: boolean, blockedFields: string[] }
 */
export const validateSensitiveFieldUpdate = (user, updates) => {
  const sensitiveFields = ['ssn_tax_id', 'dob'];
  const blockedFields = [];
  
  const canEdit = canViewSensitiveEmployeeData(user);
  
  if (!canEdit) {
    sensitiveFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        blockedFields.push(field);
      }
    });
  }
  
  return {
    allowed: blockedFields.length === 0,
    blockedFields
  };
};

/**
 * Strips sensitive fields from object if user doesn't have permission
 * @param {Object} employee - Employee data object
 * @param {Object} user - Current user
 * @returns {Object} - Employee data with sensitive fields removed or masked
 */
export const sanitizeEmployeeData = (employee, user) => {
  if (!employee) return null;
  
  const canView = canViewSensitiveEmployeeData(user);
  
  if (canView) {
    return employee;
  }
  
  // Create copy and mask sensitive fields
  const sanitized = { ...employee };
  
  if (sanitized.ssn_tax_id) {
    sanitized.ssn_tax_id = maskSSN(sanitized.ssn_tax_id);
  }
  
  if (sanitized.dob) {
    delete sanitized.dob; // Hide DOB completely
  }
  
  return sanitized;
};