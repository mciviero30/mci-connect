import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { getRequiredAgreements } from '@/components/core/agreementsConfig';

/**
 * Tax Profile Gate
 * BLOCKS access to entire app until tax profile is completed
 * EXCEPTION: CEO/Admin are exempt
 * 
 * CRITICAL: Reads user from cache, not props, for stability
 */
export default function TaxProfileGate({ children }) {
  // CRITICAL: All hooks MUST be called unconditionally at the top
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Read user from cache (stable, doesn't cause prop changes)
  const user = queryClient.getQueryData(['currentUser']);
  
  // Compute stable derived values BEFORE hooks
  const userEmail = user?.email || null;
  const userRole = user?.role || null;
  const isTaxOnboardingPage = location?.pathname?.includes('TaxOnboarding') || false;
  const isExempt = userRole === 'ceo' || userRole === 'admin';
  const shouldFetchProfile = !!userEmail && !isExempt;

  // CRITICAL: Check if AgreementGate is still blocking
  const agreementSignatures = queryClient.getQueryData(['agreementSignatures', userEmail]) || [];
  const requiredAgreements = user ? getRequiredAgreements(user) : [];
  const hasPendingAgreements = requiredAgreements.length > 0 && !requiredAgreements.every(agreement => 
    agreementSignatures.some(sig => 
      sig?.agreement_type === agreement?.type && 
      sig?.version === agreement?.version &&
      sig?.accepted === true
    )
  );

  // Fetch tax profile - ALWAYS called, enabled flag is stable
  const { data: taxProfile, isLoading, error } = useQuery({
    queryKey: ['taxProfile', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      try {
        const profiles = await base44.entities.TaxProfile.filter({ 
          employee_email: userEmail 
        });
        return profiles?.[0] || null;
      } catch (err) {
        // Fail closed: treat query error as incomplete profile
        if (import.meta.env.DEV) {
          console.error('TaxProfile query error:', err);
        }
        return null;
      }
    },
    enabled: shouldFetchProfile,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Create alert if tax profile incomplete - stable dependencies
  useEffect(() => {
    if (!userEmail || isLoading || isExempt) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile?.completed;

    if (needsTaxOnboarding) {
      // Defensive: catch errors to prevent crash
      base44.entities.SystemAlert.filter({
        recipient_email: userEmail,
        alert_type: 'tax_info_incomplete',
        read: false,
      }).then(existingAlerts => {
        if (!existingAlerts || existingAlerts.length === 0) {
          base44.entities.SystemAlert.create({
            recipient_email: userEmail,
            alert_type: 'tax_info_incomplete',
            title: 'Tax Information Required',
            message: 'You must complete your tax information before using the system. This is required by federal law.',
            severity: 'critical',
            action_url: '/TaxOnboarding',
          }).catch(err => {
            // Silent fail: alert creation is not critical for gate function
            if (import.meta.env.DEV) {
              console.error('Failed to create tax alert:', err);
            }
          });
        }
      }).catch(err => {
        // Silent fail: alert check is not critical for gate function
        if (import.meta.env.DEV) {
          console.error('Failed to check tax alerts:', err);
        }
      });
    }
  }, [userEmail, taxProfile, isLoading, isExempt]);

  // CONDITIONAL RENDERING - happens AFTER all hooks
  
  // DEV: Log render order
  if (import.meta.env.DEV) {
    console.log('🟢 TaxProfileGate rendering:', {
      userEmail,
      isLoading,
      isExempt,
      hasPendingAgreements,
      taxProfileCompleted: taxProfile?.completed
    });
  }
  
  // Defensive: if no user, fail open (allow access)
  if (!userEmail) {
    return children;
  }

  // Show loading while checking (fail closed during verification)
  if (!isExempt && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying tax information...</p>
        </div>
      </div>
    );
  }

  // If query errored, fail closed (block with loading state)
  if (!isExempt && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-red-600 dark:text-red-400">Unable to verify tax information. Please refresh.</p>
        </div>
      </div>
    );
  }

  // DECLARATIVE REDIRECT: Block access if tax profile not completed
  // CRITICAL: Only block if AgreementGate is NOT blocking (respects gate hierarchy)
  if (
    userEmail &&
    !isExempt &&
    !isLoading &&
    !hasPendingAgreements &&
    !isTaxOnboardingPage &&
    (!taxProfile || !taxProfile.completed)
  ) {
    if (import.meta.env.DEV) {
      console.log('🚨 TaxProfileGate BLOCKING access - redirecting to TaxOnboarding');
    }
    return <Navigate to={createPageUrl('TaxOnboarding')} replace />;
  }
  
  // DEV: Log passthrough
  if (import.meta.env.DEV) {
    console.log('✅ TaxProfileGate allowing access');
  }

  // Allow access if: exempt, tax profile loaded and complete
  return children;
}