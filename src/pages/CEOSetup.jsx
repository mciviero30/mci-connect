import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Building2, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * CEO Setup Wizard
 * 
 * Only accessible to CEO on first login.
 * Guides CEO through:
 * 1. Company information
 * 2. Inviting first admin/managers
 * 3. Commission setup
 * 
 * After completion, CEO never sees this again.
 */
export default function CEOSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Current step
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyTimezone: 'America/New_York',
    adminEmail: '',
    managerEmail1: '',
    managerEmail2: '',
    commissionEnabled: true,
    commissionPercentage: 10,
  });

  // Get current user from cache
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);

  // Verify user is CEO
  const isCEO = user?.role === 'ceo' || user?.position === 'CEO';

  // Update user to mark setup complete
  const updateUserMutation = useMutation({
    mutationFn: async () => {
      return await base44.auth.updateMe({
        ceo_setup_completed: true,
      });
    },
    onSuccess: () => {
      // Invalidate cache and navigate to dashboard
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      navigate(createPageUrl('Dashboard'));
    },
  });

  // Invite admin/manager emails
  const inviteUsersMutation = useMutation({
    mutationFn: async (emails) => {
      const validEmails = emails.filter(e => e && e.trim());
      
      for (const email of validEmails) {
        // Check if already exists in PendingEmployee
        const existing = await base44.asServiceRole.entities.PendingEmployee.filter({
          email: email.toLowerCase().trim(),
        });

        if (existing.length === 0) {
          // Create invitation
          await base44.asServiceRole.entities.PendingEmployee.create({
            first_name: email.split('@')[0],
            last_name: 'Invited',
            email: email.toLowerCase().trim(),
            position: validEmails.indexOf(email) === 0 ? 'administrator' : 'manager',
            status: 'invited',
            invited_date: new Date().toISOString(),
          });
        }
      }

      return { success: true };
    },
  });

  // Prevent non-CEO access
  if (!isCEO) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This page is only for CEO. You will be redirected.
          </p>
          <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.companyName.trim()) {
        alert('Company name is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Invite users if provided
      if (formData.adminEmail || formData.managerEmail1 || formData.managerEmail2) {
        await inviteUsersMutation.mutateAsync([
          formData.adminEmail,
          formData.managerEmail1,
          formData.managerEmail2,
        ]);
      }
      setStep(3);
    }
  };

  const handleComplete = async () => {
    await updateUserMutation.mutateAsync();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome, CEO
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Let's set up your company in MCI Connect
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      s < step ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Company Name *
                  </label>
                  <Input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g., MCI Installations"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Company Address
                  </label>
                  <Input
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    placeholder="123 Main St, City, State 12345"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Timezone
                  </label>
                  <select
                    name="companyTimezone"
                    value={formData.companyTimezone}
                    onChange={handleChange}
                    className="w-full h-12 px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option>America/New_York</option>
                    <option>America/Chicago</option>
                    <option>America/Denver</option>
                    <option>America/Los_Angeles</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    You can update company information anytime from Settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Invite Team */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Invite Your Team
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    First Administrator Email
                  </label>
                  <Input
                    name="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@company.com"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Manager Email 1
                  </label>
                  <Input
                    name="managerEmail1"
                    type="email"
                    value={formData.managerEmail1}
                    onChange={handleChange}
                    placeholder="manager1@company.com"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Manager Email 2
                  </label>
                  <Input
                    name="managerEmail2"
                    type="email"
                    value={formData.managerEmail2}
                    onChange={handleChange}
                    placeholder="manager2@company.com"
                    className="h-12"
                  />
                </div>

                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-900 dark:text-green-200">
                    Invitations will be sent after setup. You can invite more people anytime.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Commission Setup */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Commission Model (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="commissionEnabled"
                    checked={formData.commissionEnabled}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <label className="text-slate-900 dark:text-white font-semibold">
                    Enable commission tracking
                  </label>
                </div>

                {formData.commissionEnabled && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Default Commission Percentage (%)
                    </label>
                    <Input
                      name="commissionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commissionPercentage}
                      onChange={handleChange}
                      className="h-12"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      You can set custom percentages per role/employee later.
                    </p>
                  </div>
                )}

                <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <AlertDescription className="text-purple-900 dark:text-purple-200">
                    You can change commission settings anytime from Settings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="h-12"
          >
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={inviteUsersMutation.isPending}
              className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {inviteUsersMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inviting...
                </>
              ) : (
                'Next'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={updateUserMutation.isPending}
              className="h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>

        {/* Error Messages */}
        {updateUserMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              {updateUserMutation.error?.message || 'Error completing setup. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {inviteUsersMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              {inviteUsersMutation.error?.message || 'Error inviting users. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}