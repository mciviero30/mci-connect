import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

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
  const isFieldRoute = location?.pathname?.includes('/Field') || false;
  const isOnboardingPage = location?.pathname?.includes('OnboardingWizard') || false;
  const isExempt = userRole === 'ceo' || userRole === 'admin';
  
  // CRITICAL: Don't check tax until onboarding is complete
  const onboardingIncomplete = user && user.onboarding_completed !== true;
  const shouldFetchProfile = !!userEmail && !isExempt && !isFieldRoute && !onboardingIncomplete;



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
        // Fail OPEN on error: allow access if query fails
        if (import.meta.env.DEV) {
          console.error('TaxProfile query error (failing open):', err);
        }
        return { completed: true }; // Pretend complete to allow access
      }
    },
    enabled: shouldFetchProfile,
    retry: 0, // Don't retry, fail fast
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
      isFieldRoute,
      taxProfileCompleted: taxProfile?.completed
    });
  }
  
  // CRITICAL: Skip gate for special routes
  if (isFieldRoute || isOnboardingPage) {
    return children;
  }
  
  // Defensive: if no user, fail open (allow access)
  if (!userEmail) {
    return children;
  }
  
  // CRITICAL: Don't check tax until onboarding is complete
  if (onboardingIncomplete) {
    if (import.meta.env.DEV) {
      console.log('⏭️ TaxProfileGate: Skipping tax check - onboarding incomplete');
    }
    return children;
  }

  // Exempt users skip tax check
  if (isExempt) {
    return children;
  }

  // DECLARATIVE REDIRECT: Block access if tax profile not completed
  // (only after onboarding is complete)
  if (
    userEmail &&
    !isLoading &&
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