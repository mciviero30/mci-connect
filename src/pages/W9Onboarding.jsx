import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, Shield, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function W9Onboarding() {
  const [step, setStep] = useState(1); // 1: W-9, 2: Agreement, 3: Complete
  const [w9Data, setW9Data] = useState({
    business_name: '',
    tax_classification: 'individual',
    address: '',
    city: '',
    state: '',
    zip: '',
    ssn_ein: '',
    signature: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Get onboarding ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const onboardingId = urlParams.get('id') || window.location.pathname.split('/onboarding/')[1];

  // Find user by onboarding link
  const { data: user, isLoading } = useQuery({
    queryKey: ['onboardingUser', onboardingId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.onboarding_link?.includes(onboardingId));
    },
    enabled: !!onboardingId
  });

  const completeW9Mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');

      // Update user with W-9 data
      await base44.entities.User.update(user.id, {
        w9_completed: true,
        w9_completed_date: new Date().toISOString(),
        fiscal_state: w9Data.state,
        address: w9Data.address,
        city: w9Data.city,
        state: w9Data.state,
        zip: w9Data.zip,
        ssn_tax_id: w9Data.ssn_ein
      });

      return user;
    },
    onSuccess: () => {
      setStep(2);
    }
  });

  const completeAgreementMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');

      // Update user with agreement acceptance
      await base44.entities.User.update(user.id, {
        agreement_accepted: true,
        agreement_accepted_date: new Date().toISOString()
      });

      // Check if both W-9 and Agreement are done - auto-activate
      if (user.w9_completed) {
        await base44.entities.User.update(user.id, {
          employment_status: 'ACTIVO'
        });
      }

      return user;
    },
    onSuccess: () => {
      setStep(3);
    }
  });

  const handleW9Submit = (e) => {
    e.preventDefault();
    completeW9Mutation.mutate();
  };

  const handleAgreementSubmit = (e) => {
    e.preventDefault();
    if (!agreementAccepted) {
      alert('You must accept the agreement to continue');
      return;
    }
    completeAgreementMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 text-lg font-semibold">Invalid or expired onboarding link</p>
            <p className="text-slate-400 text-sm mt-2">Please contact your administrator</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Complete
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-2xl bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">¡Onboarding Complete! ✅</h1>
            <p className="text-slate-300 mb-6">
              Welcome {user.first_name}! Your account has been activated.
            </p>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 text-left">
              <p className="text-green-400 font-semibold mb-2">✓ What's completed:</p>
              <ul className="text-green-300 text-sm space-y-1">
                <li>✓ W-9 Form submitted</li>
                <li>✓ Legal Agreement accepted</li>
                <li>✓ Account status: ACTIVE</li>
              </ul>
            </div>

            <Button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
            >
              Access MCI Connect Platform
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Agreement
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-3xl bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Step 2: Legal Agreement</CardTitle>
                <p className="text-slate-400 text-sm">Review and accept subcontractor agreement</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAgreementSubmit} className="space-y-6">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-h-96 overflow-y-auto">
                <h3 className="text-white font-bold mb-4">INDEPENDENT SUBCONTRACTOR AGREEMENT</h3>
                <div className="text-slate-300 text-sm space-y-3">
                  <p>This agreement is entered into between MCI (Company) and {user.full_name} (Subcontractor).</p>
                  
                  <p className="font-semibold text-white">1. INDEPENDENT CONTRACTOR STATUS</p>
                  <p>Subcontractor agrees to perform services as an independent contractor. Subcontractor is not an employee and is responsible for all taxes, insurance, and benefits.</p>
                  
                  <p className="font-semibold text-white">2. SCOPE OF WORK</p>
                  <p>Subcontractor will provide services as assigned on a project-by-project basis. Work assignments will be communicated through the MCI Connect platform.</p>
                  
                  <p className="font-semibold text-white">3. PAYMENT</p>
                  <p>Payment will be made per project upon completion and approval. Rates and terms will be specified for each individual project.</p>
                  
                  <p className="font-semibold text-white">4. CONFIDENTIALITY</p>
                  <p>Subcontractor agrees to maintain confidentiality of all company information, client data, and proprietary processes.</p>
                  
                  <p className="font-semibold text-white">5. TERMINATION</p>
                  <p>Either party may terminate this agreement with written notice. Outstanding work will be compensated as agreed.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900 border border-slate-700 rounded-lg p-4">
                <Checkbox
                  id="agreement"
                  checked={agreementAccepted}
                  onCheckedChange={setAgreementAccepted}
                  className="mt-1"
                />
                <label htmlFor="agreement" className="text-white text-sm cursor-pointer flex-1">
                  I, <strong>{user.full_name}</strong>, have read and agree to the terms of this Independent Subcontractor Agreement. 
                  I understand that I am an independent contractor and not an employee of MCI.
                </label>
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="bg-slate-700 border-slate-600 text-white">
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={!agreementAccepted || completeAgreementMutation.isPending}
                  className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3]"
                >
                  {completeAgreementMutation.isPending ? 'Processing...' : 'Accept & Complete'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: W-9 Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-3xl bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Step 1: W-9 Form</CardTitle>
              <p className="text-slate-400 text-sm">Complete your tax information</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
            <AlertDescription className="text-blue-300 text-sm">
              <p className="font-semibold mb-1">Welcome {user.first_name}!</p>
              <p>Please complete this W-9 form to continue your onboarding as an independent subcontractor.</p>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleW9Submit} className="space-y-4">
            <div>
              <Label className="text-white">Legal Name / Business Name *</Label>
              <Input
                value={w9Data.business_name}
                onChange={(e) => setW9Data({ ...w9Data, business_name: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="Full legal name or business name"
                required
              />
            </div>

            <div>
              <Label className="text-white">Tax Classification *</Label>
              <Select value={w9Data.tax_classification} onValueChange={(value) => setW9Data({ ...w9Data, tax_classification: value })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-white">Street Address *</Label>
                <Input
                  value={w9Data.address}
                  onChange={(e) => setW9Data({ ...w9Data, address: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-white">City *</Label>
                <Input
                  value={w9Data.city}
                  onChange={(e) => setW9Data({ ...w9Data, city: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-white">State *</Label>
                <Select value={w9Data.state} onValueChange={(value) => setW9Data({ ...w9Data, state: value })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                    <SelectItem value="TN">Tennessee</SelectItem>
                    <SelectItem value="AL">Alabama</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">ZIP Code *</Label>
                <Input
                  value={w9Data.zip}
                  onChange={(e) => setW9Data({ ...w9Data, zip: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <Label className="text-white">SSN or EIN *</Label>
                <Input
                  value={w9Data.ssn_ein}
                  onChange={(e) => setW9Data({ ...w9Data, ssn_ein: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Social Security Number or Employer Identification Number</p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <Label className="text-white mb-2 block">Electronic Signature *</Label>
              <Input
                value={w9Data.signature}
                onChange={(e) => setW9Data({ ...w9Data, signature: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="Type your full legal name"
                required
              />
              <p className="text-xs text-yellow-400 mt-2">
                By typing your name, you certify that the information provided is accurate and you are authorized to complete this W-9 form.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                type="submit" 
                disabled={completeW9Mutation.isPending}
                className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3]"
              >
                {completeW9Mutation.isPending ? 'Submitting...' : 'Continue to Agreement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}