import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle } from "lucide-react";

export default function SafetyAcknowledgmentForm({ onSubmit, isProcessing }) {
  const [formData, setFormData] = useState({
    zero_tolerance: false,
    ppe_compliance: false,
    fall_protection: false,
    stop_work_authority: false,
    incident_reporting: false
  });

  const allChecked = Object.values(formData).every(v => v === true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allChecked) {
      alert('Debes aceptar todos los puntos de seguridad para continuar');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card className="bg-white border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <CardTitle className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          Form 1: Safety Acknowledgment (MCI Program)
        </CardTitle>
        <p className="text-sm text-red-100 mt-2">You must acknowledge all safety requirements to proceed</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <input
                type="checkbox"
                id="zero_tolerance"
                checked={formData.zero_tolerance}
                onChange={(e) => setFormData({...formData, zero_tolerance: e.target.checked})}
                className="w-5 h-5 accent-red-600 mt-0.5 flex-shrink-0"
                required
              />
              <Label htmlFor="zero_tolerance" className="cursor-pointer text-sm">
                <strong className="text-red-700">Zero Tolerance Policy:</strong> I understand and accept MCI's "Zero Tolerance" policy regarding drugs and alcohol. Any violation will result in immediate termination.
              </Label>
            </div>

            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <input
                type="checkbox"
                id="ppe_compliance"
                checked={formData.ppe_compliance}
                onChange={(e) => setFormData({...formData, ppe_compliance: e.target.checked})}
                className="w-5 h-5 accent-orange-600 mt-0.5 flex-shrink-0"
                required
              />
              <Label htmlFor="ppe_compliance" className="cursor-pointer text-sm">
                <strong className="text-orange-700">PPE Compliance:</strong> I commit to wearing a hard hat, safety glasses, high-visibility vest, and steel-toe boots at all times on site. No exceptions.
              </Label>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <input
                type="checkbox"
                id="fall_protection"
                checked={formData.fall_protection}
                onChange={(e) => setFormData({...formData, fall_protection: e.target.checked})}
                className="w-5 h-5 accent-amber-600 mt-0.5 flex-shrink-0"
                required
              />
              <Label htmlFor="fall_protection" className="cursor-pointer text-sm">
                <strong className="text-amber-700">Fall Protection:</strong> I understand that work at 6ft or higher requires active fall protection systems and prior training. I will not attempt such work without proper certification.
              </Label>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="stop_work_authority"
                checked={formData.stop_work_authority}
                onChange={(e) => setFormData({...formData, stop_work_authority: e.target.checked})}
                className="w-5 h-5 accent-blue-600 mt-0.5 flex-shrink-0"
                required
              />
              <Label htmlFor="stop_work_authority" className="cursor-pointer text-sm">
                <strong className="text-blue-700">Stop Work Authority:</strong> I acknowledge my authority and responsibility to stop any unsafe task immediately, without fear of retaliation.
              </Label>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <input
                type="checkbox"
                id="incident_reporting"
                checked={formData.incident_reporting}
                onChange={(e) => setFormData({...formData, incident_reporting: e.target.checked})}
                className="w-5 h-5 accent-green-600 mt-0.5 flex-shrink-0"
                required
              />
              <Label htmlFor="incident_reporting" className="cursor-pointer text-sm">
                <strong className="text-green-700">Incident Reporting:</strong> I agree to report any injury or "near miss" to my supervisor immediately, regardless of severity.
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-300 rounded-lg mt-6">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              By checking all boxes, you confirm that you have read, understood, and agree to comply with MCI's safety requirements.
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={!allChecked || isProcessing}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-6 text-lg font-bold"
          >
            {isProcessing ? 'Saving...' : 'Complete Safety Acknowledgment (Step 1/3)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}