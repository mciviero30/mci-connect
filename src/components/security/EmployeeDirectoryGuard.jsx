import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, UserX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SECURITY GATE: Enforces EmployeeDirectory record requirement
 * Blocks access if auth.user exists but NO EmployeeDirectory record (by user_id)
 * 
 * FAIL-FAST: No partial access, no data leakage
 */
export default function EmployeeDirectoryGuard({ children, user }) {
  // No user = let auth system handle it
  if (!user) {
    return <>{children}</>;
  }

  // Admin/CEO/Owner bypass (safety fallback)
  // Using role check only — no hardcoded emails
  const isOwnerOrAdmin = 
    user.role === 'admin' ||
    user.role === 'ceo' ||
    user.position === 'CEO' ||
    user.is_owner === true;

  if (isOwnerOrAdmin) {
    return <>{children}</>;
  }

  // Query EmployeeDirectory by user_id OR email (fallback)
  const { data: directoryRecords, isLoading, error } = useQuery({
    queryKey: ['employeeDirectoryGuard', user.id, user.email],
    queryFn: async () => {
      // Try user_id first
      let records = await base44.entities.EmployeeDirectory.filter({ user_id: user.id });
      
      // Fallback to email if no user_id match
      if (!records || records.length === 0) {
        records = await base44.entities.EmployeeDirectory.filter({ employee_email: user.email });
      }
      
      return records;
    },
    staleTime: 300000, // 5 min cache
    gcTime: 600000,
    retry: 1,
    enabled: !!user.id
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Error state - block access
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-red-900/20 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-red-300 dark:border-red-800 p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center">
            Verification Failed
          </h1>

          <p className="text-red-700 dark:text-red-400 text-sm mb-6 text-center">
            Unable to verify your account status. Please contact your administrator.
          </p>

          <Button 
            onClick={() => base44.auth.logout()}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  // SECURITY GATE: No EmployeeDirectory record = BLOCK
  if (!directoryRecords || directoryRecords.length === 0) {
    console.error(`🚫 SECURITY BLOCK: User ${user.email} (${user.id}) has no EmployeeDirectory record`);
    
    // AUDIT LOG: Silent logging for admin visibility
    React.useEffect(() => {
      const logBlockedAccess = async () => {
        try {
          await base44.entities.AuditLog.create({
            event: 'access_blocked_not_onboarded',
            user_id: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
            details: `User authenticated but no EmployeeDirectory record found`,
            severity: 'warning',
            category: 'security'
          });
        } catch (err) {
          console.error('Failed to log blocked access:', err);
        }
      };
      logBlockedAccess();
    }, [user.id, user.email]);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-red-900/20 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-red-300 dark:border-red-800 p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
            <UserX className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center">
            Account Not Onboarded
          </h1>

          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm text-center">
              Please contact your administrator.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl p-4 mb-6">
            <p className="text-slate-700 dark:text-slate-400 text-xs mb-2">
              <strong>Account Details:</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-500 text-xs font-mono">
              {user.email}
            </p>
          </div>

          <Button 
            onClick={() => base44.auth.logout()}
            className="w-full bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>

          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">
            This is a security measure to prevent unauthorized access
          </p>
        </div>
      </div>
    );
  }

  // VALID: User has EmployeeDirectory record
  return <>{children}</>;
}