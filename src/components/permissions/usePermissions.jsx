import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

// Permission system based on position
export const usePermissions = () => {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);

  const hasFullAccess = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    
    const fullAccessPositions = ['CEO', 'administrator', 'manager'];
    const fullAccessDepartments = ['HR'];
    
    const hasPosition = currentUser.position && fullAccessPositions.includes(currentUser.position);
    const hasDepartment = currentUser.department && fullAccessDepartments.includes(currentUser.department);
    
    return hasPosition || hasDepartment;
  };

  const hasManagerAccess = () => {
    return hasFullAccess();
  };

  const hasFinanceAccess = () => {
    return hasFullAccess();
  };

  const hasHRAccess = () => {
    if (!currentUser) return false;
    if (hasFullAccess()) return true;
    
    return currentUser.department === 'HR' || currentUser.position === 'manager';
  };

  const canViewReports = () => {
    return hasFullAccess() || hasManagerAccess();
  };

  const canManageEmployees = () => {
    return hasFullAccess() || hasHRAccess();
  };

  return {
    user: currentUser,
    hasFullAccess: hasFullAccess(),
    hasManagerAccess: hasManagerAccess(),
    hasFinanceAccess: hasFinanceAccess(),
    hasHRAccess: hasHRAccess(),
    canViewReports: canViewReports(),
    canManageEmployees: canManageEmployees(),
  };
};