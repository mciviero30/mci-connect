import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, Upload, AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CERT_TYPES = [
  { value: 'OSHA 10', label: 'OSHA 10', color: 'bg-orange-500' },
  { value: 'OSHA 30', label: 'OSHA 30', color: 'bg-red-500' },
  { value: 'Forklift', label: 'Forklift', color: 'bg-blue-500' },
  { value: 'Fall Protection', label: 'Fall Protection', color: 'bg-purple-500' },
  { value: 'CPR', label: 'CPR / First Aid', color: 'bg-green-500' },
  { value: 'Drug Test', label: 'Drug Test', color: 'bg-pink-500' }
];

export default function WorkforceVaultTab({ isAdmin, user }) {
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: '',
    certification_type: '',
    certification_name: '',
    issuing_organization: '',
    issue_date: '',
    expiration_date: '',
    certificate_number: '',
    certificate_url: ''
  });

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    enabled: isAdmin
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications-vault'],
    queryFn: () => isAdmin 
      ? base44.entities.Certification.list()
      : base44.entities.Certification.filter({ employee_email: user?.email })
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    }
  });

  const createCertMutation = useMutation({
    mutationFn: (data) => base44.entities.Certification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications-vault'] });
      setShowDialog(false);
      setFormData({
        employee_email: '',
        certification_type: '',
        certification_name: '',
        issuing_organization: '',
        issue_date: '',
        expiration_date: '',
        certificate_number: '',
        certificate_url: ''
      });
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const url = await uploadFileMutation.mutateAsync(file);
      setFormData({...formData, certificate_url: url});
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const employee = employees.find(e => e.email === formData.employee_email);
    createCertMutation.mutate({
      ...formData,
      employee_name: employee?.full_name || ''
    });
  };

  const getCertStatus = (cert) => {
    if (!cert.expiration_date) return { status: 'valid', label: 'No Expiration', color: 'bg-slate-500' };
    
    const now = new Date();
    const expDate = new Date(cert.expiration_date);
    const daysUntilExpiry = (expDate - now) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'EXPIRED', color: 'bg-red-600', icon: AlertTriangle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${Math.ceil(daysUntilExpiry)} days`, color: 'bg-yellow-600', icon: Clock };
    } else {
      return { status: 'valid', label: 'Valid', color: 'bg-green-600', icon: CheckCircle };
    }
  };

  // Group certifications by employee
  const certsByEmployee = certifications.reduce((acc, cert) => {
    if (!acc[cert.employee_email]) {
      acc[cert.employee_email] = {
        employee_name: cert.employee_name,
        employee_email: cert.employee_email,
        certs: []
      };
    }
    acc[cert.employee_email].certs.push(cert);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Workforce Readiness Vault</h2>
          <p className="text-slate-600 dark:text-slate-400">OSHA, Forklift, Fall Protection, CPR, and Drug Test certificates</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload Certificate
          </Button>
        )}
      </div>

      {/* Certification Matrix */}
      <div className="space-y-4">
        {Object.values(certsByEmployee).map((empData) => (
          <Card key={empData.employee_email} className="bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{empData.employee_name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{empData.employee_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {CERT_TYPES.map((certType) => {
                  const cert = empData.certs.find(c => c.certification_type === certType.value);
                  const status = cert ? getCertStatus(cert) : null;

                  return (
                    <div key={certType.value} className="relative">
                      <div className={`p-3 rounded-xl border-2 ${cert ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${certType.color}`}></div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {certType.label}
                          </span>
                        </div>
                        
                        {cert ? (
                          <>
                            <div className="flex items-center gap-1 mb-2">
                              {status.icon && <status.icon className="w-3 h-3" />}
                              <Badge className={`${status.color} text-white text-[10px] px-1.5 py-0.5`}>
                                {status.label}
                              </Badge>
                            </div>
                            {cert.certificate_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-7 text-xs"
                                onClick={() => window.open(cert.certificate_url, '_blank')}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-600">Not uploaded</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(certsByEmployee).length === 0 && (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No certificates uploaded yet</h3>
              <p className="text-slate-600 dark:text-slate-400">Start building your workforce safety vault</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Shield className="w-5 h-5 text-blue-600" />
              Upload Safety Certificate
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={formData.employee_email} onValueChange={(v) => setFormData({...formData, employee_email: v})}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900">
                  {employees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Certificate Type</Label>
              <Select value={formData.certification_type} onValueChange={(v) => setFormData({...formData, certification_type: v})}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900">
                  {CERT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input 
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  className="bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input 
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <Label>Certificate Document</Label>
              {formData.certificate_url ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-green-700">✓ Document uploaded</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, certificate_url: ''})}>
                    Remove
                  </Button>
                </div>
              ) : (
                <Input 
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              )}
              {uploadingFile && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white" disabled={!formData.certificate_url}>
                Save Certificate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}