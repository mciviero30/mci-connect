import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

/**
 * Tax Profile Gate
 * BLOCKS access to entire app until tax profile is completed
 * EXCEPTION: CEO/Admin are exempt
 */
export default function TaxProfileGate({ user, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTaxOnboardingPage = location.pathname.includes('TaxOnboarding');

  // Exempt CEO/Admin from tax onboarding requirement
  const isExempt = user?.role === 'ceo' || user?.role === 'admin';

  // Fetch tax profile
  const { data: taxProfile, isLoading } = useQuery({
    queryKey: ['taxProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.TaxProfile.filter({ 
        employee_email: user.email 
      });
      return profiles[0] || null;
    },
    enabled: !!user?.email && !isExempt,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Create alert if tax profile incomplete
  useEffect(() => {
    if (isLoading || !user || isExempt) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile.completed;

    if (needsTaxOnboarding && user.email) {
      // Check if alert already exists
      base44.entities.SystemAlert.filter({
        recipient_email: user.email,
        alert_type: 'tax_info_incomplete',
        read: false,
      }).then(existingAlerts => {
        if (existingAlerts.length === 0) {
          // Create critical alert
          base44.entities.SystemAlert.create({
            recipient_email: user.email,
            alert_type: 'tax_info_incomplete',
            title: 'Tax Information Required',
            message: 'You must complete your tax information before using the system. This is required by federal law.',
            severity: 'critical',
            action_url: '/TaxOnboarding',
          });
        }
      });
    }
  }, [user, taxProfile, isLoading, isExempt]);

  // CRITICAL: Block access if tax profile not completed
  useEffect(() => {
    if (isLoading || !user || isExempt) return;
    if (isTaxOnboardingPage) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile.completed;

    if (needsTaxOnboarding) {
      navigate(createPageUrl('TaxOnboarding'), { replace: true });
    }
  }, [user, taxProfile, isLoading, isTaxOnboardingPage, navigate, isExempt]);

  // Show loading while checking
  if (!isExempt && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying tax information...</p>
        </div>
      </div>
    );
  }

  return children;
}