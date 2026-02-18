/**
 * Utility functions for name handling and display
 */

/**
 * Capitalizes first letter of each word (Title Case)
 * Example: "john doe" -> "John Doe", "JOHN DOE" -> "John Doe"
 * Prompt #74: Normalization function
 */
export const capitalizeName = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Auto-capitalize input value as user types
 * Use this for: names, job names, customer names, addresses, etc.
 * Example: "john" -> "John", "new york" -> "New York"
 */
export const autoCapitalize = (value) => {
  if (!value) return '';
  
  // Split by space and capitalize each word
  return value
    .split(' ')
    .map(word => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Handle input change with auto-capitalization
 * Use in onChange handlers for fields that need capitalization
 */
export const handleCapitalizedInput = (e, setStateFunction, fieldName) => {
  const value = e.target.value;
  const capitalized = autoCapitalize(value);
  
  if (typeof setStateFunction === 'function') {
    setStateFunction(prev => ({ ...prev, [fieldName]: capitalized }));
  }
};

/**
 * Gets proper display name from employee/user object
 * Handles first_name + last_name, full_name, or email
 * PRIORITY ORDER (Prompt #74):
 * 1. first_name + last_name (Title Case)
 * 2. full_name (Title Case)
 * 3. Email username (Title Case)
 */
export const getDisplayName = (employee) => {
  if (!employee) return 'Unknown Employee';
  
  // FIRST: Try first_name + last_name (the correct way)
  if (employee.first_name || employee.last_name) {
    const firstName = capitalizeName(employee.first_name || '');
    const lastName = capitalizeName(employee.last_name || '');
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
  }
  
  // SECOND: If full_name exists and doesn't look like an email
  if (employee.full_name && !employee.full_name.includes('@')) {
    return capitalizeName(employee.full_name);
  }
  
  // THIRD: Extract from email and capitalize (Title Case)
  if (employee.email) {
    const emailName = employee.email.split('@')[0];
    return emailName
      .split('.')
      .map(part => capitalizeName(part))
      .join(' ');
  }
  
  return 'Unknown Employee';
};

/**
 * Gets initials from name for avatar display
 */
export const getInitials = (employee) => {
  if (!employee) return 'U';
  
  const name = getDisplayName(employee);
  const parts = name.split(' ').filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return name[0]?.toUpperCase() || 'U';
};

/**
 * Formats phone number to (XXX)XXX-XXXX
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Validates email format
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Prompt #74: Normalize name for display in tables/lists
 * Always returns Title Case format
 * Priority: first_name + last_name > full_name > email
 */
export const normalizeEmployeeName = (employee) => {
  return getDisplayName(employee);
};

/**
 * Prompt #74: Get first and last name separately (normalized)
 */
export const getFirstLastName = (employee) => {
  if (!employee) return { first: '', last: '' };
  
  if (employee.first_name || employee.last_name) {
    return {
      first: capitalizeName(employee.first_name || ''),
      last: capitalizeName(employee.last_name || '')
    };
  }
  
  if (employee.full_name && !employee.full_name.includes('@')) {
    const parts = employee.full_name.split(' ');
    return {
      first: capitalizeName(parts[0] || ''),
      last: capitalizeName(parts.slice(1).join(' ') || '')
    };
  }
  
  if (employee.email) {
    const emailName = employee.email.split('@')[0];
    const parts = emailName.split('.');
    return {
      first: capitalizeName(parts[0] || ''),
      last: capitalizeName(parts.slice(1).join(' ') || '')
    };
  }
  
  return { first: '', last: '' };
};

/**
 * Format position title without abbreviations
 * CEO -> Chief Executive Officer, etc.
 */
export const formatPosition = (position) => {
  if (!position) return 'Employee';
  if (position.toUpperCase() === 'CEO') return 'Chief Executive Officer';
  if (position.toUpperCase() === 'CFO') return 'Chief Financial Officer';
  if (position.toUpperCase() === 'CTO') return 'Chief Technology Officer';
  if (position.toUpperCase() === 'COO') return 'Chief Operating Officer';
  if (position.toUpperCase() === 'CMO') return 'Chief Marketing Officer';
  if (position.toUpperCase() === 'HR') return 'Human Resources';
  return position.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Gets proper display name from customer object
 * PRIORITY ORDER:
 * 1. first_name + last_name (Title Case)
 * 2. name field (legacy)
 * 3. company name
 * 4. Email
 */
export const getCustomerDisplayName = (customer) => {
  if (!customer) return 'Unknown Customer';
  
  // FIRST: Try first_name + last_name
  if (customer.first_name || customer.last_name) {
    const firstName = capitalizeName(customer.first_name || '');
    const lastName = capitalizeName(customer.last_name || '');
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
  }
  
  // SECOND: Legacy name field
  if (customer.name && !customer.name.includes('@')) {
    return capitalizeName(customer.name);
  }
  
  // THIRD: Company name
  if (customer.company) {
    return customer.company;
  }
  
  // LAST: Email fallback
  if (customer.email) {
    return customer.email;
  }
  
  return 'Unknown Customer';
};

/**
 * Sort customers alphabetically by first_name, then last_name
 */
export const sortCustomersByName = (customers) => {
  return [...customers].sort((a, b) => {
    // Get display name to extract first and last parts
    const aDisplay = getCustomerDisplayName(a).toLowerCase();
    const bDisplay = getCustomerDisplayName(b).toLowerCase();
    
    // Try to extract first name from display name
    const aFirst = aDisplay.split(' ')[0] || '';
    const bFirst = bDisplay.split(' ')[0] || '';
    
    // Try to extract last name (everything after first name)
    const aLast = aDisplay.split(' ').slice(1).join(' ') || '';
    const bLast = bDisplay.split(' ').slice(1).join(' ') || '';
    
    // First compare by first name
    if (aFirst !== bFirst) {
      return aFirst.localeCompare(bFirst);
    }
    
    // If first name is same, compare by last name
    return aLast.localeCompare(bLast);
  });
};

/**
 * Sort employees alphabetically by first_name, then last_name
 */
export const sortEmployeesByName = (employees) => {
  return [...employees].sort((a, b) => {
    // Get display name to extract first and last parts
    const aDisplay = getDisplayName(a).toLowerCase();
    const bDisplay = getDisplayName(b).toLowerCase();
    
    // Try to extract first name from display name
    const aFirst = aDisplay.split(' ')[0] || '';
    const bFirst = bDisplay.split(' ')[0] || '';
    
    // Try to extract last name (everything after first name)
    const aLast = aDisplay.split(' ').slice(1).join(' ') || '';
    const bLast = bDisplay.split(' ').slice(1).join(' ') || '';
    
    // First compare by first name
    if (aFirst !== bFirst) {
      return aFirst.localeCompare(aFirst);
    }
    
    // If first name is same, compare by last name
    return aLast.localeCompare(bLast);
  });
};