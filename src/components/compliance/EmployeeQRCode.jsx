import React from "react";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EmployeeQRCode({ employee }) {
  const { data: certifications = [] } = useQuery({
    queryKey: ['employee-certs', employee.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: employee.email })
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['employee-onboarding', employee.email],
    queryFn: () => base44.entities.OnboardingForm.filter({ employee_email: employee.email })
  });

  // Check if all required certs are valid
  const requiredCerts = ['OSHA 10', 'OSHA 30', 'CPR', 'Drug Test'];
  const validCerts = certifications.filter(cert => {
    if (!cert.expiration_date) return true;
    return new Date(cert.expiration_date) > new Date();
  });

  const hasAllRequired = requiredCerts.every(req => 
    validCerts.some(cert => cert.certification_type === req)
  );

  const onboardingComplete = onboardingForms.length >= 3;
  const isReadyForField = hasAllRequired && onboardingComplete;

  // Generate QR code data
  const qrData = JSON.stringify({
    name: employee.full_name,
    email: employee.email,
    position: employee.position,
    hire_date: employee.hire_date,
    certifications: validCerts.map(c => ({
      type: c.certification_type,
      expires: c.expiration_date
    })),
    onboarding_complete: onboardingComplete,
    field_ready: isReadyForField,
    generated_at: new Date().toISOString()
  });

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-${employee.email}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${employee.full_name.replace(/\s/g, '_')}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <QrCode className="w-5 h-5 text-blue-600" />
          Field Safety Pass
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <QRCode
            id={`qr-code-${employee.email}`}
            value={qrData}
            size={200}
            level="H"
            className="mx-auto"
          />
        </div>

        {/* Readiness Status */}
        <div className={`p-4 rounded-lg border-2 ${
          isReadyForField 
            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isReadyForField ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-900 dark:text-green-200">FIELD READY</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-900 dark:text-red-200">NOT CLEARED</span>
              </>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {onboardingComplete ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className={onboardingComplete ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
                Onboarding {onboardingComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasAllRequired ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className={hasAllRequired ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
                Required Certifications {hasAllRequired ? 'Valid' : 'Missing/Expired'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Certifications */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Active Certifications
          </h4>
          <div className="flex flex-wrap gap-2">
            {validCerts.length > 0 ? (
              validCerts.map(cert => (
                <Badge key={cert.id} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {cert.certification_type}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">No certifications on file</span>
            )}
          </div>
        </div>

        {/* Download Button */}
        <Button onClick={handleDownload} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <Download className="w-4 h-4 mr-2" />
          Download QR Code
        </Button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          Show this QR code to site inspectors for instant verification
        </p>
      </CardContent>
    </Card>
  );
}