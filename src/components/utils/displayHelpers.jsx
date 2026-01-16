/**
 * Display Helpers - Unified utilities for employee data display
 * Eliminates código duplicado across múltiples componentes
 */

/**
 * Get proper display name from employee object
 * Priority: first_name + last_name > full_name > email extraction
 */
export const getDisplayName = (employee) => {
  if (!employee) return 'Unknown Employee';
  
  // FIRST: Try first_name + last_name (the correct way)
  if (employee.first_name || employee.last_name) {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    if (fullName) return fullName;
  }
  
  // SECOND: If full_name exists and doesn't look like an email
  if (employee.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
    return employee.full_name;
  }
  
  // LAST RESORT: Extract from email and capitalize
  if (employee.email) {
    const emailName = employee.email.split('@')[0];
    return emailName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  return 'Unknown Employee';
};

/**
 * Get profile image URL with preference handling
 * Priority: preferred_profile_image setting > profile_photo_url > avatar_image_url
 */
export const getProfileImage = (employee) => {
  if (!employee) return null;
  
  // Check preferred image first
  if (employee.preferred_profile_image === 'avatar' && employee.avatar_image_url) {
    return employee.avatar_image_url;
  }
  
  // Then check profile_photo_url
  if (employee.profile_photo_url) {
    return employee.profile_photo_url;
  }
  
  // Fallback to avatar if exists
  if (employee.avatar_image_url) {
    return employee.avatar_image_url;
  }
  
  return null;
};

/**
 * Get cache busting key for profile images
 */
export const getImageKey = (employee) => employee?.profile_last_updated || employee?.id;

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || 'U';
};

/**
 * Format currency consistently
 */
export const formatCurrency = (amount) => {
  return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format hours with decimal
 */
export const formatHours = (hours) => {
  return `${(hours || 0).toFixed(1)}h`;
};