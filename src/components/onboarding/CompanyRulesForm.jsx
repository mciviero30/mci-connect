import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Briefcase, Clock, Smartphone, Wrench, Users } from "lucide-react";

export default function CompanyRulesForm({ onSubmit, isProcessing }) {
  const [formData, setFormData] = useState({
    punctuality: false,
    app_usage: false,
    tool_care: false,
    site_conduct: false
  });

  const allChecked = Object.values(formData).every(v => v === true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allChecked) {
      alert('Debes aceptar todas las reglas de la compañía para continuar');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card className="bg-white border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-3">
          <Briefcase className="w-6 h-6" />
          Form 2: Company Rules & Policies
        </CardTitle>
        <p className="text-sm text-blue-100 mt-2">Acknowledge and agree to MCI's operational policies</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="punctuality"
                checked={formData.punctuality}
                onChange={(e) => setFormData({...formData, punctuality: e.target.checked})}
                className="w-5 h-5 accent-blue-600 mt-0.5 flex-shrink-0"
                required
              />
              <div className="flex-1">
                <Label htmlFor="punctuality" className="cursor-pointer text-sm flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <strong className="text-blue-700">Punctuality:</strong>
                </Label>
                <p className="text-sm text-slate-700">
                  Work starts exactly at the time assigned by my Team Leader (e.g., Atlanta Team). I understand that three unexcused tardies will lead to disciplinary action, including potential termination.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <input
                type="checkbox"
                id="app_usage"
                checked={formData.app_usage}
                onChange={(e) => setFormData({...formData, app_usage: e.target.checked})}
                className="w-5 h-5 accent-indigo-600 mt-0.5 flex-shrink-0"
                required
              />
              <div className="flex-1">
                <Label htmlFor="app_usage" className="cursor-pointer text-sm flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <strong className="text-indigo-700">App Usage (MCI Connect):</strong>
                </Label>
                <p className="text-sm text-slate-700">
                  I will clock in and clock out daily from the project location using the MCI Connect app. This is mandatory for accurate payroll processing and attendance tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <input
                type="checkbox"
                id="tool_care"
                checked={formData.tool_care}
                onChange={(e) => setFormData({...formData, tool_care: e.target.checked})}
                className="w-5 h-5 accent-purple-600 mt-0.5 flex-shrink-0"
                required
              />
              <div className="flex-1">
                <Label htmlFor="tool_care" className="cursor-pointer text-sm flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-purple-600" />
                  <strong className="text-purple-700">Tool Care & Responsibility:</strong>
                </Label>
                <p className="text-sm text-slate-700">
                  I am responsible for all tools assigned to me. Negligent loss or damage may result in deductions from my paycheck. I will return tools in good condition at the end of each shift.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <input
                type="checkbox"
                id="site_conduct"
                checked={formData.site_conduct}
                onChange={(e) => setFormData({...formData, site_conduct: e.target.checked})}
                className="w-5 h-5 accent-green-600 mt-0.5 flex-shrink-0"
                required
              />
              <div className="flex-1">
                <Label htmlFor="site_conduct" className="cursor-pointer text-sm flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <strong className="text-green-700">Professional Site Conduct:</strong>
                </Label>
                <p className="text-sm text-slate-700">
                  I will treat all customers, contractors, and team members with respect and professionalism. I understand MCI has zero tolerance for harassment, discrimination, or unprofessional behavior.
                </p>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!allChecked || isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-bold mt-6"
          >
            {isProcessing ? 'Saving...' : 'Complete Company Rules (Step 2/3)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}