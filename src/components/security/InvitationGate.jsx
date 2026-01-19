import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SECURITY GATE: Blocks access if email doesn't match invitation
 * Only allows entry with the exact email that received the invitation
 */
export default function InvitationGate({ children, user }) {
  const [validationState, setValidationState] = useState({
    isValidating: true,
    isValid: false,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setValidationState({ isValidating: false, isValid: false, error: null });
      return;
    }

    const validateInvitation = async () => {
      try {
        const response = await base44.functions.invoke('validateInvitationEmail', {});
        const result = response?.data || response;

        console.log('🔒 Invitation validation result:', result);

        setValidationState({
          isValidating: false,
          isValid: result.valid === true,
          error: result.valid ? null : (result.message || result.error)
        });

      } catch (err) {
        console.error('🚫 Invitation validation failed:', err);
        setValidationState({
          isValidating: false,
          isValid: false,
          error: 'Unable to validate invitation. Please contact support.'
        });
      }
    };

    validateInvitation();
  }, [user]);

  // Loading state
  if (validationState.isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Validating access...</p>
        </div>
      </div>
    );
  }

  // BLOCKED: Invalid invitation
  if (!validationState.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-red-900/20 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-red-300 dark:border-red-800 p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center">
            Access Denied
          </h1>

          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm font-medium mb-2">
              🚫 Security Check Failed
            </p>
            <p className="text-red-700 dark:text-red-400 text-sm">
              {validationState.error || 'No invitation found for this email address.'}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 rounded-xl p-4 mb-6">
            <p className="text-blue-900 dark:text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Current Email
            </p>
            <p className="text-blue-800 dark:text-blue-400 text-sm font-mono">
              {user?.email}
            </p>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400 mb-6 space-y-2">
            <p className="font-medium">ℹ️ Why am I seeing this?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>You must register with the exact email that received the invitation</li>
              <li>This security measure prevents unauthorized access</li>
              <li>Contact your administrator if you need assistance</li>
            </ul>
          </div>

          <Button 
            onClick={() => base44.auth.logout()}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout & Try Different Email
          </Button>

          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">
            For security assistance, contact your administrator
          </p>
        </div>
      </div>
    );
  }

  // VALID: Allow access
  return <>{children}</>;
}