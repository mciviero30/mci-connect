import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Upload, CheckCircle, User, CreditCard, Building2, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";

export default function PersonalPaperworkForm({ onSubmit, isProcessing, employeeEmail }) {
  const [formData, setFormData] = useState({
    legal_full_name: '',
    ssn_or_itin: '',
    date_of_birth: '',
    drivers_license_url: '',
    social_security_card_url: '',
    bank_name: '',
    routing_number: '',
    account_number: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: ''
  });

  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingSSCard, setUploadingSSCard] = useState(false);

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    }
  });

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const setLoading = field === 'drivers_license_url' ? setUploadingLicense : setUploadingSSCard;
    setLoading(true);

    try {
      const url = await uploadFileMutation.mutateAsync(file);
      setFormData({...formData, [field]: url});
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation - ONLY REQUIRED: personal info, bank, emergency
    if (!formData.legal_full_name || !formData.ssn_or_itin || !formData.date_of_birth) {
      alert('Please fill in all required personal information');
      return;
    }
    
    // REMOVED: Document upload requirements (optional now)
    
    if (!formData.bank_name || !formData.routing_number || !formData.account_number) {
      alert('Please fill in all bank information for direct deposit');
      return;
    }
    
    if (!formData.emergency_contact_name || !formData.emergency_contact_phone) {
      alert('Please provide emergency contact information');
      return;
    }

    onSubmit(formData);
  };

  return (
    <Card className="bg-white border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <CardTitle className="flex items-center gap-3">
          <FileText className="w-6 h-6" />
          Form 3: Personal Paperwork (Admin Data)
        </CardTitle>
        <p className="text-sm text-green-100 mt-2">Complete your employee profile and submit required documents</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Personal Information
            </h3>
            
            <div>
              <Label className="text-slate-700">Full Legal Name (as per ID) *</Label>
              <Input
                value={formData.legal_full_name}
                onChange={(e) => setFormData({...formData, legal_full_name: e.target.value})}
                placeholder="First Middle Last"
                className="bg-slate-50"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">SSN or ITIN *</Label>
                <Input
                  value={formData.ssn_or_itin}
                  onChange={(e) => setFormData({...formData, ssn_or_itin: e.target.value})}
                  placeholder="XXX-XX-XXXX"
                  className="bg-slate-50"
                  required
                />
              </div>
              
              <div>
                <Label className="text-slate-700">Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  className="bg-slate-50"
                  required
                />
              </div>
            </div>
          </div>

          {/* Document Uploads - OPTIONAL */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Optional Documents
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Driver's License / State ID (Optional)</Label>
                <div className="mt-2">
                  {formData.drivers_license_url ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700">ID Uploaded</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({...formData, drivers_license_url: ''})}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'drivers_license_url')}
                      disabled={uploadingLicense}
                      className="bg-slate-50"
                    />
                  )}
                  {uploadingLicense && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Social Security Card / Work Permit (Optional)</Label>
                <div className="mt-2">
                  {formData.social_security_card_url ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700">Document Uploaded</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({...formData, social_security_card_url: ''})}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'social_security_card_url')}
                      disabled={uploadingSSCard}
                      className="bg-slate-50"
                    />
                  )}
                  {uploadingSSCard && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Direct Deposit Information
            </h3>

            <div>
              <Label className="text-slate-700">Bank Name *</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                placeholder="e.g., Bank of America"
                className="bg-slate-50"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Routing Number *</Label>
                <Input
                  value={formData.routing_number}
                  onChange={(e) => setFormData({...formData, routing_number: e.target.value})}
                  placeholder="9 digits"
                  maxLength={9}
                  className="bg-slate-50"
                  required
                />
              </div>
              
              <div>
                <Label className="text-slate-700">Account Number *</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  placeholder="Account number"
                  className="bg-slate-50"
                  required
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Emergency Contact
            </h3>

            <div>
              <Label className="text-slate-700">Full Name *</Label>
              <Input
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                placeholder="Emergency contact name"
                className="bg-slate-50"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Relationship</Label>
                <Input
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                  placeholder="e.g., Spouse, Parent"
                  className="bg-slate-50"
                />
              </div>
              
              <div>
                <Label className="text-slate-700">Phone Number *</Label>
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                  placeholder="(XXX) XXX-XXXX"
                  className="bg-slate-50"
                  required
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-bold"
          >
            {isProcessing ? 'Submitting...' : 'Complete Personal Paperwork (Step 3/3)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}