/**
 * useEmployeeProfile Hook
 * Fetches and merges Employee entity data with auth.me() data
 * Single source of truth for user profile display
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Merge employee data with auth user data
 * Priority: Employee entity wins for all operational fields
 * @param {object} authUser - User from base44.auth.me()
 * @param {object} employee - Employee entity record
 * @returns {object} Merged profile
 */
export function mergeProfile(authUser, employee) {
  if (!authUser) return null;
  
  // Safe get: never overwrite existing value with null/undefined/empty
  const safeGet = (employeeVal, authVal, fallback = '') => {
    if (employeeVal !== null && employeeVal !== undefined && employeeVal !== '') return employeeVal;
    if (authVal !== null && authVal !== undefined && authVal !== '') return authVal;
    return fallback;
  };

  // Build full_name with priority
  let full_name = authUser.full_name || authUser.email;
  
  if (employee) {
    // Priority 1: Employee entity full_name
    if (employee.full_name) {
      full_name = employee.full_name;
    }
    // Priority 2: Employee first + last
    else if (employee.first_name || employee.last_name) {
      full_name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    }
    // Priority 3: Auth user full_name
    else if (authUser.full_name) {
      full_name = authUser.full_name;
    }
    // Priority 4: Auth user first + last
    else if (authUser.first_name || authUser.last_name) {
      full_name = `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim();
    }
    // Fallback: email
    else {
      full_name = authUser.email;
    }
  }

  return {
    ...authUser,
    // Name fields (employee wins)
    full_name,
    first_name: safeGet(employee?.first_name, authUser.first_name),
    last_name: safeGet(employee?.last_name, authUser.last_name),
    
    // Operational fields (employee wins)
    position: safeGet(employee?.position, authUser.position),
    department: safeGet(employee?.department, authUser.department),
    team_id: safeGet(employee?.team_id, authUser.team_id),
    team_name: safeGet(employee?.team_name, authUser.team_name),
    phone: safeGet(employee?.phone, authUser.phone),
    address: safeGet(employee?.address, authUser.address),
    hourly_rate: employee?.hourly_rate ?? authUser.hourly_rate,
    
    // Dates (employee wins)
    hire_date: safeGet(employee?.hire_date, authUser.hire_date),
    dob: safeGet(employee?.dob, authUser.dob),
    
    // Status fields (employee wins)
    employment_status: safeGet(employee?.employment_status, authUser.employment_status, 'active'),
    
    // Personal info (employee wins)
    ssn_tax_id: safeGet(employee?.ssn_tax_id, authUser.ssn_tax_id),
    tshirt_size: safeGet(employee?.tshirt_size, authUser.tshirt_size),
    
    // Emergency contact (employee wins)
    emergency_contact_name: safeGet(employee?.emergency_contact_name, authUser.emergency_contact_name),
    emergency_contact_phone: safeGet(employee?.emergency_contact_phone, authUser.emergency_contact_phone),
    emergency_contact_relationship: safeGet(employee?.emergency_contact_relationship, authUser.emergency_contact_relationship),
    
    // Language preference (employee wins)
    preferred_language: safeGet(employee?.preferred_language, authUser.preferred_language, 'en'),
    language_preference: safeGet(employee?.language_preference, authUser.language_preference),
    
    // Auth fields stay from authUser
    id: authUser.id,
    email: authUser.email,
    role: authUser.role,
    
    // Photo preferences stay from authUser (user controls this)
    profile_photo_url: authUser.profile_photo_url,
    avatar_image_url: authUser.avatar_image_url,
    preferred_profile_image: authUser.preferred_profile_image,
    profile_last_updated: authUser.profile_last_updated,
    
    // Metadata
    _merged: true,
    _employee_id: employee?.id,
    _has_employee_record: !!employee
  };
}

/**
 * Hook to fetch and merge employee profile
 * @param {string} email - User email
 * @param {object} authUser - User from base44.auth.me()
 * @returns {object} { profile, employee, isLoading, error }
 */
export default function useEmployeeProfile(email, authUser) {
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employeeProfile', email],
    queryFn: async () => {
      if (!email) return null;
      
      // Case-insensitive email match
      const allEmployees = await base44.entities.EmployeeDirectory.list();
      const found = allEmployees.find(
        emp => emp.email?.toLowerCase() === email.toLowerCase()
      );
      
      return found || null;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const profile = mergeProfile(authUser, employee);

  return {
    profile,
    employee,
    isLoading,
    error,
    hasEmployeeRecord: !!employee
  };
}