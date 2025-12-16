import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, FileText } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function ModernEmployeeCard({ employee, onboardingProgress, onViewDetails }) {
  const navigate = useNavigate();

  const displayName = (() => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (employee.full_name && !employee.full_name.includes('@')) {
      return employee.full_name;
    }
    return employee.email.split('@')[0].split('.').map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join(' ');
  })();

  const formatPosition = (position) => {
    if (!position) return 'Employee';
    
    // Check if it's an acronym (all caps or should be all caps)
    const acronyms = ['CEO', 'CFO', 'CTO', 'COO', 'CIO', 'HR', 'IT'];
    const upperPosition = position.toUpperCase();
    
    if (acronyms.includes(upperPosition)) {
      return upperPosition;
    }
    
    // Otherwise, capitalize each word
    return position.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;
  const isOfficeReady = progressPercentage >= 100;

  return (
    <Card className="bg-white rounded-3xl shadow-xl border-0 overflow-hidden hover:shadow-2xl transition-all duration-300">
      <div className="p-8">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">
                {displayName}
              </h3>
              <p className="text-slate-600 text-lg">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2"
          >
            <FileText className="w-5 h-5" />
            Manage Profile
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-slate-700">
              Onboarding Complete: {progressPercentage}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges and Team */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <Badge className="bg-green-500 text-white px-5 py-2 rounded-full text-base font-medium">
              Active
            </Badge>
            <Badge className="bg-blue-600 text-white px-5 py-2 rounded-full text-base font-medium">
              Full-Time
            </Badge>
          </div>
          
          <Badge 
            variant="outline" 
            className="border-2 border-blue-600 text-slate-900 bg-transparent px-5 py-2 rounded-full text-base font-medium"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="flex items-center justify-between text-slate-600 text-base pt-4 border-t border-slate-200">
          {employee.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-400" />
              <span>{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-slate-400" />
              <span>{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      <div 
        onClick={() => onViewDetails(employee)}
        className="bg-gradient-to-r from-blue-500 to-blue-700 p-4 text-white text-center font-semibold text-lg cursor-pointer hover:from-blue-600 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
      >
        <span>Add New</span>
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-blue-600 text-2xl font-bold">+</span>
        </div>
      </div>
    </Card>
  );
}