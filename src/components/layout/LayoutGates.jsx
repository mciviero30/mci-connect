import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Building2, ClipboardList, User, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvitationGate from '@/components/security/InvitationGate';
import TwoFactorGate from '@/components/security/TwoFactorGate';
import AgreementGate from '@/components/agreements/AgreementGate';
import TaxProfileGate from '@/components/tax/TaxProfileGate';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

/**
 * Declarative gate system - handles all user access control flows
 * Order matters: CEO Setup > Onboarding > Welcome > Permission Gates
 */
export function LayoutGates({ user, children, isClientOnly, location, navigate, queryClient }) {
  // GATE 0: CEO Setup (runs before onboarding)
  const ceoSetupIncomplete = user?.role === 'ceo' && user?.ceo_setup_completed !== true;
  const isCEOSetupRoute = location.pathname.includes('/CEOSetup');
  const shouldBlockForCEOSetup = ceoSetupIncomplete && !isCEOSetupRoute;

  if (shouldBlockForCEOSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Setup Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please complete the CEO setup to access the app.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('CEOSetup'))}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          >
            Complete Setup
          </Button>
        </div>
      </div>
    );
  }

  // GATE 1: Onboarding (block non-admin users)
  const isAdminOrCEO = user?.role === 'admin' || user?.role === 'ceo' || user?.position === 'CEO';
  const isOnboardingRoute = location.pathname.includes('/Onboarding');
  const shouldBlockForOnboarding = user && 
    !isClientOnly && 
    !isAdminOrCEO &&
    user.employment_status !== 'deleted' &&
    user.onboarding_completed === false;

  if (shouldBlockForOnboarding && !isOnboardingRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <ClipboardList className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Onboarding Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please complete your onboarding before accessing the app.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('OnboardingWizard'))}
            className="soft-blue-gradient text-white shadow-lg"
          >
            Complete Onboarding
          </Button>
        </div>
      </div>
    );
  }

  // GATE 2: Deleted users
  if (user && user.employment_status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-red-500/30">
            <UserX className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-red-600 dark:text-red-400 mb-4">Your account has been deactivated.</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => window.location.reload()} className="soft-red-gradient text-white shadow-lg">
            Logout
          </Button>
        </div>
      </div>
    );
  }

  // GATE 3: Client-only users
  if (isClientOnly && location.pathname !== createPageUrl('ClientPortal')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Client Access</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Redirecting to your project portal...
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('ClientPortal'))}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          >
            Go to Client Portal
          </Button>
        </div>
      </div>
    );
  }

  // GATE 4: Welcome Screen (first login)
  const shouldShowWelcome = user && 
    !isClientOnly && 
    user.employment_status !== 'deleted' &&
    user.welcome_screen_shown !== true;

  if (shouldShowWelcome) {
    return (
      <WelcomeScreen 
        user={user} 
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
        }} 
      />
    );
  }

  // All gates passed - render permission gates + content
  return (
    <InvitationGate user={user}>
      <TwoFactorGate user={user}>
        <AgreementGate>
          <TaxProfileGate>
            {children}
          </TaxProfileGate>
        </AgreementGate>
      </TwoFactorGate>
    </InvitationGate>
  );
}