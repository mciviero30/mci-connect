import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import SafetyAcknowledgmentForm from "@/components/onboarding/SafetyAcknowledgmentForm";
import CompanyRulesForm from "@/components/onboarding/CompanyRulesForm";
import PersonalPaperworkForm from "@/components/onboarding/PersonalPaperworkForm";

export default function OnboardingWizard() {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms', user?.email],
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
      queryClient.invalidateQueries({ queryKey: ['onboardingForms'] });
      
      // Update user data with personal paperwork
      if (variables.formType === 'personal_paperwork') {
        await base44.auth.updateMe({
          legal_full_name: variables.formData.legal_full_name,
          ssn_tax_id: variables.formData.ssn_or_itin,
          dob: variables.formData.date_of_birth,
          drivers_license_url: variables.formData.drivers_license_url,
          social_security_card_url: variables.formData.social_security_card_url,
          bank_name: variables.formData.bank_name,
          routing_number: variables.formData.routing_number,
          account_number: variables.formData.account_number,
          emergency_contact_name: variables.formData.emergency_contact_name,
          emergency_contact_phone: variables.formData.emergency_contact_phone,
          emergency_contact_relationship: variables.formData.emergency_contact_relationship
        });
      }
      
      // Count unique form types (prevent duplicates from counting)
      const uniqueForms = {};
      [...onboardingForms, data].forEach(form => {
        uniqueForms[form.form_type] = form;
      });
      const totalCompleted = Object.keys(uniqueForms).length;
      
      // Move to next step or complete
      if (totalCompleted < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // ✅ ONBOARDING COMPLETE - Set definitive flags
        await base44.auth.updateMe({ 
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_status: 'completed'
        });
        
        if (import.meta.env.DEV) {
          console.log('✅ All 3 unique forms completed. Onboarding LOCKED as complete.');
        }
        
        // Invalidate queries to refresh user
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['onboardingForms'] });
        
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    }
  });

  // GUARD: If onboarding already completed, redirect immediately
  useEffect(() => {
    if (user?.onboarding_completed === true) {
      if (import.meta.env.DEV) {
        console.log('🚫 Onboarding already completed, redirecting...');
      }
      window.location.href = '/';
      return;
    }
  }, [user?.onboarding_completed]);

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
    }
  }, [onboardingForms, user?.onboarding_completed]);

  const completedSteps = onboardingForms.length;
  const progressPercentage = Math.round((completedSteps / 3) * 100); // Exact 33.3% per step

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
          <p className="text-lg text-slate-600">Complete 3 mandatory forms to unlock your dashboard</p>
          <div className="inline-block mt-3 px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-sm font-bold text-red-700">🔒 Access Restricted: {3 - completedSteps} form(s) remaining</p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="p-6 mb-8 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {currentStep === 1 ? (
                <Circle className="w-6 h-6 text-blue-600 fill-blue-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              <span className={`text-sm font-semibold ${currentStep === 1 ? 'text-blue-600' : 'text-green-600'}`}>
                Safety
              </span>
            </div>
            
            <div className="flex-1 h-1 mx-4 bg-slate-200">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500" 
                style={{ width: `${Math.min(50, progressPercentage / 2 * 100)}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 2 ? (
                <Circle className="w-6 h-6 text-slate-400" />
              ) : currentStep === 2 ? (
                <Circle className="w-6 h-6 text-blue-600 fill-blue-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              <span className={`text-sm font-semibold ${currentStep === 2 ? 'text-blue-600' : currentStep < 2 ? 'text-slate-400' : 'text-green-600'}`}>
                Rules
              </span>
            </div>

            <div className="flex-1 h-1 mx-4 bg-slate-200">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500" 
                style={{ width: `${Math.max(0, (progressPercentage - 50) / 50 * 100)}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Circle className="w-6 h-6 text-slate-400" />
              ) : currentStep === 3 ? (
                <Circle className="w-6 h-6 text-blue-600 fill-blue-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              <span className={`text-sm font-semibold ${currentStep === 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                Paperwork
              </span>
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
              {completedSteps} of 3 Forms Completed
            </p>
            <p className="text-sm text-slate-600">
              {progressPercentage}% Complete • {completedSteps === 0 ? '3 forms remaining' : completedSteps === 1 ? '2 forms remaining' : completedSteps === 2 ? '1 form remaining' : '✅ All forms submitted'}
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
      </div>
    </div>
  );
}