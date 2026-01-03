// 🔒 ROLE-BASED PERMISSIONS FOR FIELD
// Central authority for Field role checks

/**
 * Check if user can edit tasks/punch items
 * Only Admin, CEO, Manager, Supervisor, Foreman
 */
export const canEditTasks = (user) => {
  if (!user) return false;
  
  const role = (user.role || '').toLowerCase();
  const position = (user.position || '').toLowerCase();
  
  // Role-based (source of truth)
  if (role === 'admin' || role === 'ceo' || role === 'manager') return true;
  
  // Position-based (legacy fallback)
  if (position.includes('supervisor') || 
      position.includes('foreman') || 
      position.includes('manager') ||
      position.includes('ceo')) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can approve punch items
 * Only Admin, CEO, Manager, Supervisor
 */
export const canApprovePunch = (user) => {
  if (!user) return false;
  
  const role = (user.role || '').toLowerCase();
  const position = (user.position || '').toLowerCase();
  
  if (role === 'admin' || role === 'ceo' || role === 'manager') return true;
  
  if (position.includes('supervisor') || 
      position.includes('manager') ||
      position.includes('ceo')) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can toggle client visibility
 * Only Admin, CEO, Manager
 */
export const canToggleClientVisibility = (user) => {
  if (!user) return false;
  
  const role = (user.role || '').toLowerCase();
  const position = (user.position || '').toLowerCase();
  
  if (role === 'admin' || role === 'ceo' || role === 'manager') return true;
  
  if (position.includes('ceo') || position === 'manager') return true;
  
  return false;
};

/**
 * Check if user is a client
 */
export const isClient = (user) => {
  if (!user) return false;
  return (user.role || '').toLowerCase() === 'customer';
};

/**
 * Get role priority for conflict resolution
 * Higher number = higher priority
 */
export const getRolePriority = (user) => {
  if (!user) return 0;
  
  const role = (user.role || '').toLowerCase();
  const position = (user.position || '').toLowerCase();
  
  // CEO/Admin: Highest priority
  if (role === 'admin' || role === 'ceo' || position.includes('ceo')) return 100;
  
  // Manager: High priority
  if (role === 'manager' || position.includes('manager')) return 80;
  
  // Supervisor/Foreman: Medium priority
  if (position.includes('supervisor') || position.includes('foreman')) return 60;
  
  // Technician/Employee: Low priority
  if (role === 'employee' || position.includes('technician')) return 40;
  
  // Client: Lowest priority
  if (role === 'customer') return 20;
  
  // Default
  return 10;
};