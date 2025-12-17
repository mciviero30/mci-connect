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
          ssn_tax_id: variables.formData.ssn_or_itin,
          dob: variables.formData.date_of_birth,
          emergency_contact_name: variables.formData.emergency_contact_name,
          emergency_contact_phone: variables.formData.emergency_contact_phone,
          emergency_contact_relationship: variables.formData.emergency_contact_relationship,
          onboarding_completed: true
        });
      }
      
      // Move to next step or complete
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // Reload page to show dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    }
  });

  // Determine which step to show based on completed forms
  useEffect(() => {
    if (onboardingForms.length === 0) {
      setCurrentStep(1);
    } else if (onboardingForms.length === 1) {
      setCurrentStep(2);
    } else if (onboardingForms.length === 2) {
      setCurrentStep(3);
    }
  }, [onboardingForms]);

  const completedSteps = onboardingForms.length;
  const progressPercentage = (completedSteps / 3) * 100;

  const handleFormSubmit = (formType, formData) => {
    createFormMutation.mutate({ formType, formData });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to MCI Connect</h1>
          <p className="text-lg text-slate-600">Complete your onboarding to access the dashboard</p>
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
          <p className="text-center text-sm text-slate-600 mt-2">
            {completedSteps} of 3 steps completed ({Math.round(progressPercentage)}%)
          </p>
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