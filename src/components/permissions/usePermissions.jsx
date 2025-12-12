import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Permission system based on position
export const usePermissions = () => {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const hasFullAccess = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const fullAccessPositions = ['CEO', 'administrator'];
    return fullAccessPositions.includes(user.position);
  };

  const hasManagerAccess = () => {
    if (!user) return false;
    if (hasFullAccess()) return true;
    
    return user.position === 'manager' || user.department === 'HR';
  };

  const hasFinanceAccess = () => {
    return hasFullAccess();
  };

  const hasHRAccess = () => {
    if (!user) return false;
    if (hasFullAccess()) return true;
    
    return user.department === 'HR' || user.position === 'manager';
  };

  const canViewReports = () => {
    return hasFullAccess() || hasManagerAccess();
  };

  const canManageEmployees = () => {
    return hasFullAccess() || hasHRAccess();
  };

  return {
    user,
    hasFullAccess: hasFullAccess(),
    hasManagerAccess: hasManagerAccess(),
    hasFinanceAccess: hasFinanceAccess(),
    hasHRAccess: hasHRAccess(),
    canViewReports: canViewReports(),
    canManageEmployees: canManageEmployees(),
  };
};