import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CURRENT_USER_QUERY_KEY, ONBOARDING_FORMS_QUERY_KEY } from "@/components/constants/queryKeys";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, UserX } from "lucide-react";
import { createPageUrl } from "@/utils";
import SafetyAcknowledgmentForm from "@/components/onboarding/SafetyAcknowledgmentForm";
import CompanyRulesForm from "@/components/onboarding/CompanyRulesForm";
import PersonalPaperworkForm from "@/components/onboarding/PersonalPaperworkForm";
import ProfileReviewForm from "@/components/onboarding/ProfileReviewForm";

export default function OnboardingWizard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    retry: 1
  });

  // Handle loading and errors to prevent white screen
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserX className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Profile</h1>
          <p className="text-slate-600 mb-6">
            {userError?.message || 'Please refresh the page or contact support.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ONBOARDING_FORMS_QUERY_KEY(user?.email),
    queryFn: () => base44.entities.OnboardingForm.filter({ employee_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const createFormMutation = useMutation({
    mutationFn: async ({ formType, formData }) => {
      // Check if form already exists (prevent duplicates)
      const existingForm = onboardingForms.find(f => f.form_type === formType);
      if (existingForm) {
        if (import.meta.env.DEV) {
          console.log(`⚠️ Form ${formType} already exists, updating...`);
        }
        return base44.entities.OnboardingForm.update(existingForm.id, {
          form_data: formData,
          completed_date: new Date().toISOString()
        });
      }
      
      return base44.entities.OnboardingForm.create({
        employee_email: user.email,
        employee_name: user.full_name,
        form_type: formType,
        status: 'completed',
        completed_date: new Date().toISOString(),
        form_data: formData
      });
    },
    onSuccess: async (data, variables) => {
      // Update user data with personal paperwork
      if (variables.formType === 'personal_paperwork') {
        await base44.auth.updateMe({
          legal_full_name: variables.formData.legal_full_name,
          ssn_tax_id: variables.formData.ssn_or_itin,
          dob: variables.formData.date_of_birth,
          bank_name: variables.formData.bank_name,
          routing_number: variables.formData.routing_number,
          account_number: variables.formData.account_number,
          emergency_contact_name: variables.formData.emergency_contact_name,
          emergency_contact_phone: variables.formData.emergency_contact_phone,
          emergency_contact_relationship: variables.formData.emergency_contact_relationship
        });
      }
      
      // Update user data with profile review editable fields
      if (variables.formType === 'profile_review') {
        await base44.auth.updateMe({
          address: variables.formData.address,
          tshirt_size: variables.formData.tshirt_size
        });
      }
      
      // CRITICAL: Force immediate refetch to get accurate count
      await queryClient.invalidateQueries({ queryKey: ONBOARDING_FORMS_QUERY_KEY(user.email) });
      const freshForms = await queryClient.fetchQuery({
        queryKey: ONBOARDING_FORMS_QUERY_KEY(user.email),
        queryFn: () => base44.entities.OnboardingForm.filter({ employee_email: user.email })
      });
      
      // Count unique form types (prevent duplicates from counting)
      const uniqueForms = {};
      freshForms.forEach(form => {
        uniqueForms[form.form_type] = form;
      });
      const totalCompleted = Object.keys(uniqueForms).length;
      
      if (import.meta.env.DEV) {
        console.log(`📊 Completed ${totalCompleted}/4 forms (unique types: ${Object.keys(uniqueForms).join(', ')})`);
      }
      
      // Move to next step or complete
      if (totalCompleted < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        // ✅ ONBOARDING COMPLETE
        
        // 1. Update API first
        await base44.auth.updateMe({ 
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        });
        
        // 2. Update React Query cache to reflect the change
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (old) => ({
          ...old,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        }));
        
        // 3. Navigate to Dashboard
        navigate(createPageUrl('Dashboard'), { replace: true });
      }
    }
  });

  // GUARD: If onboarding already completed, redirect immediately
  useEffect(() => {
    if (user?.onboarding_completed === true) {
      if (import.meta.env.DEV) {
        console.log('🚫 Onboarding already completed, redirecting...');
      }
      navigate(createPageUrl('Dashboard'), { replace: true });
      return;
    }
  }, [user?.onboarding_completed, navigate]);

  // Determine which step to show based on completed forms
  useEffect(() => {
    if (user?.onboarding_completed === true) return; // Never restart if completed
    
    const uniqueForms = {};
    onboardingForms.forEach(form => {
      uniqueForms[form.form_type] = form;
    });
    
    const completedCount = Object.keys(uniqueForms).length;
    
    if (completedCount === 0) {
      setCurrentStep(1);
    } else if (completedCount === 1) {
      setCurrentStep(2);
    } else if (completedCount === 2) {
      setCurrentStep(3);
    } else if (completedCount === 3) {
      setCurrentStep(4);
    }
  }, [onboardingForms, user?.onboarding_completed]);

  const completedSteps = onboardingForms.length;
  const progressPercentage = Math.round((completedSteps / 4) * 100); // 4 forms total

  const handleFormSubmit = (formType, formData) => {
    createFormMutation.mutate({ formType, formData });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl p-2">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
            alt="MCI Connect"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to MCI Connect</h1>
        <p className="text-lg text-slate-600">Complete 4 mandatory steps to unlock your dashboard</p>
        <div className="inline-block mt-3 px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-sm font-bold text-red-700">🔒 Access Restricted: {4 - completedSteps} step(s) remaining</p>
        </div>
        </div>

        {/* Progress Steps */}
        <Card className="p-6 mb-8 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {currentStep === 1 ? <Circle className="w-5 h-5 text-blue-600 fill-blue-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-blue-600' : 'text-green-600'}`}>Safety</span>
            </div>
            
            <div className="flex-1 h-1 mx-2 bg-slate-200">
              <div className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500" style={{ width: `${Math.min(100, progressPercentage / 0.25)}%` }} />
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 2 ? <Circle className="w-5 h-5 text-slate-400" /> : currentStep === 2 ? <Circle className="w-5 h-5 text-blue-600 fill-blue-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-blue-600' : currentStep < 2 ? 'text-slate-400' : 'text-green-600'}`}>Rules</span>
            </div>

            <div className="flex-1 h-1 mx-2 bg-slate-200">
              <div className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (progressPercentage - 25) / 0.25))}%` }} />
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? <Circle className="w-5 h-5 text-slate-400" /> : currentStep === 3 ? <Circle className="w-5 h-5 text-blue-600 fill-blue-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-blue-600' : currentStep < 3 ? 'text-slate-400' : 'text-green-600'}`}>Paperwork</span>
            </div>

            <div className="flex-1 h-1 mx-2 bg-slate-200">
              <div className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (progressPercentage - 50) / 0.25))}%` }} />
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? <Circle className="w-5 h-5 text-slate-400" /> : <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />}
              <span className={`text-xs font-semibold ${currentStep === 4 ? 'text-blue-600' : 'text-slate-400'}`}>Profile</span>
            </div>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center mt-3">
            <p className="text-lg font-bold text-slate-900">
              {completedSteps} of 4 Steps Completed
            </p>
            <p className="text-sm text-slate-600">
              {progressPercentage}% Complete • {4 - completedSteps} step(s) remaining
            </p>
          </div>
        </Card>

        {/* Form Content */}
        {currentStep === 1 && (
          <SafetyAcknowledgmentForm 
            onSubmit={(data) => handleFormSubmit('safety_acknowledgment', data)}
            isProcessing={createFormMutation.isPending}
          />
        )}

        {currentStep === 2 && (
          <CompanyRulesForm 
            onSubmit={(data) => handleFormSubmit('company_rules', data)}
            isProcessing={createFormMutation.isPending}
          />
        )}

        {currentStep === 3 && (
          <PersonalPaperworkForm 
            onSubmit={(data) => handleFormSubmit('personal_paperwork', data)}
            isProcessing={createFormMutation.isPending}
            employeeEmail={user?.email}
          />
        )}

        {currentStep === 4 && (
          <ProfileReviewForm 
            user={user}
            onSubmit={(data) => handleFormSubmit('profile_review', data)}
            isProcessing={createFormMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}