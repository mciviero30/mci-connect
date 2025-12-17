import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, IdCard, Plus } from "lucide-react";
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
    if (position === 'CEO') return 'Chief Executive Officer';
    return position.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;

  return (
    <Card className="bg-white rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border-0 overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300">
      <div className="p-8">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-5">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-[120px] h-[120px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[120px] h-[120px] bg-[#0052CC] rounded-full flex items-center justify-center text-white font-bold text-5xl">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="pt-2">
              <h3 className="text-[32px] font-bold text-black leading-tight mb-1">
                {displayName}
              </h3>
              <p className="text-[20px] text-slate-600">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 px-4 py-2 text-base"
          >
            <IdCard className="w-5 h-5" />
            Manage Profile
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-8">
          <p className="text-[16px] font-medium text-slate-700 mb-3">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0052CC] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3 mb-6">
          <Badge className="bg-[#10B981] hover:bg-[#10B981] text-white px-5 py-2 rounded-full text-[15px] font-semibold">
            Active
          </Badge>
          <Badge className="bg-[#0052CC] hover:bg-[#0052CC] text-white px-5 py-2 rounded-full text-[15px] font-semibold">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border-2 border-[#0052CC] text-[#0052CC] bg-white hover:bg-white px-5 py-2 rounded-full text-[15px] font-semibold"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-8 mb-0">
          {employee.email && (
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-6 h-6 text-slate-400 flex-shrink-0" />
              <span className="text-[16px]">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-6 h-6 text-slate-400 flex-shrink-0" />
              <span className="text-[16px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div className="bg-gradient-to-r from-[#0ea5e9] to-[#0052CC] px-8 py-5 cursor-pointer hover:from-[#0284c7] hover:to-[#003d99] transition-all" onClick={() => onViewDetails(employee)}>
        <div className="flex items-center justify-end gap-3">
          <span className="text-white font-bold text-[20px]">Add New</span>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-[#0052CC]" />
          </div>
        </div>
      </div>
    </Card>
  );
}