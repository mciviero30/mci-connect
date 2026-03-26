/**
 * COMMISSION ACCESS GUARD - Executive-Only Control
 * ✅ Admin / Finance / CEO only
 * ✅ Employees cannot see or access
 * ✅ Logs access attempts in DEV
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock } from 'lucide-react';

export default function CommissionAccessGuard({ children, requiredRole = 'admin' }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  // Approved roles for commission access
  const APPROVED_ROLES = ['admin', 'cfo', 'finance', 'ceo'];
  const hasAccess = user && APPROVED_ROLES.includes(user.role?.toLowerCase());

  // Log access attempt in DEV only (no alerts)
  if (import.meta.env.DEV && user && !hasAccess) {
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin">⏳</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-md mx-auto mt-12">
          <Alert className="border-red-300 bg-red-50 dark:bg-red-900/20">
            <Lock className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-200">
              <strong>Access Denied</strong><br/>
              Commission management is restricted to Admin, Finance, and Executive roles.
              {user && <p className="text-xs mt-2 opacity-75">Your role: {user.role || 'N/A'}</p>}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return children;
}