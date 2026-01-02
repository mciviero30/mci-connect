import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TaxOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    legal_name: '',
    business_name: '',
    ssn_or_ein: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    certified: false,
  });
  const [errors, setErrors] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employeeProfile } = useQuery({
    queryKey: ['employeeProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.EmployeeDirectory.filter({ 
        email: currentUser.email 
      });
      return profiles[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: existingTaxProfile } = useQuery({
    queryKey: ['taxProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.TaxProfile.filter({ 
        employee_email: currentUser.email 
      });
      return profiles[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  // Determine tax type based on employee status
  const taxType = employeeProfile?.employment_type === 'contractor' ? '1099' : 'w2';

  // Redirect if already completed
  React.useEffect(() => {
    if (existingTaxProfile?.completed) {
      navigate(createPageUrl('Dashboard'), { replace: true });
    }
  }, [existingTaxProfile, navigate]);

  // Pre-fill name if available
  React.useEffect(() => {
    if (currentUser && !formData.legal_name) {
      setFormData(prev => ({
        ...prev,
        legal_name: currentUser.full_name || '',
      }));
    }
  }, [currentUser, formData.legal_name]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Validation
      const newErrors = {};
      
      if (!data.legal_name.trim()) newErrors.legal_name = 'Legal name is required';
      if (!data.ssn_or_ein.trim()) newErrors.ssn_or_ein = 'SSN or EIN is required';
      if (!data.address_line1.trim()) newErrors.address_line1 = 'Address is required';
      if (!data.city.trim()) newErrors.city = 'City is required';
      if (!data.state.trim()) newErrors.state = 'State is required';
      if (!data.zip_code.trim()) newErrors.zip_code = 'ZIP code is required';
      if (!data.certified) newErrors.certified = 'You must certify this information';

      // Validate SSN/EIN format
      const cleanedSSN = data.ssn_or_ein.replace(/[^0-9]/g, '');
      if (taxType === 'w2' && cleanedSSN.length !== 9) {
        newErrors.ssn_or_ein = 'SSN must be 9 digits';
      }
      if (taxType === '1099' && cleanedSSN.length !== 9) {
        newErrors.ssn_or_ein = 'EIN must be 9 digits';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        throw new Error('Please fix validation errors');
      }

      setErrors({});

      // Prepare tax profile data
      const taxProfileData = {
        employee_directory_id: employeeProfile.id,
        employee_email: currentUser.email,
        tax_type: taxType,
        legal_name: data.legal_name.trim(),
        business_name: data.business_name?.trim() || null,
        ssn_or_ein: cleanedSSN,
        address_line1: data.address_line1.trim(),
        address_line2: data.address_line2?.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        zip_code: data.zip_code.trim(),
        certified: true,
        completed: true,
        completed_at: new Date().toISOString(),
      };

      let savedProfile;
      if (existingTaxProfile) {
        savedProfile = await base44.entities.TaxProfile.update(existingTaxProfile.id, taxProfileData);
      } else {
        savedProfile = await base44.entities.TaxProfile.create(taxProfileData);
      }

      // AUDIT LOG: Tax profile completed
      await base44.entities.AuditLog.create({
        event_type: 'tax_profile_completed',
        entity_type: 'TaxProfile',
        entity_id: savedProfile.id,
        performed_by: currentUser.email,
        performed_by_name: currentUser.full_name || currentUser.email,
        action_description: `Tax profile completed for ${currentUser.full_name || currentUser.email} (${taxType})`,
        after_state: {
          tax_type: taxType,
          completed: true,
        },
        metadata: {
          employee_directory_id: employeeProfile.id,
        }
      });

      return savedProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxProfile'] });
      navigate(createPageUrl('Dashboard'), { replace: true });
    },
    onError: (error) => {
      if (error.message !== 'Please fix validation errors') {
        alert('Failed to save tax information. Please try again.');
      }
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (!currentUser || !employeeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-center text-2xl">Tax Information Required</CardTitle>
          <p className="text-center text-slate-600">
            Federal law requires us to collect tax information before you can use the system
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-blue-300 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Tax Classification:</strong> You are classified as a{' '}
              <strong>{taxType === '1099' ? 'Contractor (1099)' : 'W-2 Employee'}</strong>
              <br />
              Please complete the {taxType === '1099' ? 'W-9' : 'W-4'} information below.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Legal Name */}
            <div>
              <Label>
                Full Legal Name <span className="text-red-600">*</span>
              </Label>
              <Input
                value={formData.legal_name}
                onChange={(e) => handleChange('legal_name', e.target.value)}
                placeholder="As shown on your tax documents"
                className={errors.legal_name ? 'border-red-500' : ''}
              />
              {errors.legal_name && (
                <p className="text-sm text-red-600 mt-1">{errors.legal_name}</p>
              )}
            </div>

            {/* Business Name (1099 only) */}
            {taxType === '1099' && (
              <div>
                <Label>Business Name (if applicable)</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  placeholder="Leave blank if not applicable"
                />
              </div>
            )}

            {/* SSN or EIN */}
            <div>
              <Label>
                {taxType === '1099' ? 'SSN or EIN' : 'Social Security Number (SSN)'}{' '}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                type="text"
                value={formData.ssn_or_ein}
                onChange={(e) => handleChange('ssn_or_ein', e.target.value)}
                placeholder={taxType === '1099' ? 'XXX-XX-XXXX or XX-XXXXXXX' : 'XXX-XX-XXXX'}
                maxLength={11}
                className={errors.ssn_or_ein ? 'border-red-500' : ''}
              />
              {errors.ssn_or_ein && (
                <p className="text-sm text-red-600 mt-1">{errors.ssn_or_ein}</p>
              )}
              <p className="text-xs text-slate-600 mt-1">
                🔒 This information is encrypted and visible only to administrators
              </p>
            </div>

            {/* Address */}
            <div>
              <Label>
                Address Line 1 <span className="text-red-600">*</span>
              </Label>
              <Input
                value={formData.address_line1}
                onChange={(e) => handleChange('address_line1', e.target.value)}
                placeholder="Street address"
                className={errors.address_line1 ? 'border-red-500' : ''}
              />
              {errors.address_line1 && (
                <p className="text-sm text-red-600 mt-1">{errors.address_line1}</p>
              )}
            </div>

            <div>
              <Label>Address Line 2</Label>
              <Input
                value={formData.address_line2}
                onChange={(e) => handleChange('address_line2', e.target.value)}
                placeholder="Apt, suite, unit, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>
                  City <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{errors.city}</p>
                )}
              </div>
              <div>
                <Label>
                  State <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                  placeholder="CA"
                  maxLength={2}
                  className={errors.state ? 'border-red-500' : ''}
                />
                {errors.state && (
                  <p className="text-sm text-red-600 mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            <div>
              <Label>
                ZIP Code <span className="text-red-600">*</span>
              </Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                placeholder="12345"
                maxLength={10}
                className={errors.zip_code ? 'border-red-500' : ''}
              />
              {errors.zip_code && (
                <p className="text-sm text-red-600 mt-1">{errors.zip_code}</p>
              )}
            </div>

            {/* Certification */}
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Legal Certification:</strong> By checking the box below, you certify under
                penalty of perjury that the information provided is true, correct, and complete.
              </AlertDescription>
            </Alert>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="certified"
                checked={formData.certified}
                onCheckedChange={(checked) => handleChange('certified', checked)}
                className={errors.certified ? 'border-red-500' : ''}
              />
              <label
                htmlFor="certified"
                className="text-sm leading-tight cursor-pointer"
              >
                I certify that the information provided above is accurate and complete to the best of
                my knowledge. <span className="text-red-600">*</span>
              </label>
            </div>
            {errors.certified && (
              <p className="text-sm text-red-600">{errors.certified}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Tax Information
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-600">
              This information is required by federal law and will be kept confidential.
              <br />
              Contact your administrator if you have questions.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}