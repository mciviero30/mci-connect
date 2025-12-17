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
    if (position.toUpperCase() === 'CEO') return 'Chief Executive Officer';
    return position.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;

  return (
    <Card className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 max-w-[320px]">
      <div className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-[70px] h-[70px] rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-[70px] h-[70px] bg-[#0052CC] rounded-full flex items-center justify-center text-white font-bold text-[32px] flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-[18px] font-bold text-black leading-tight mb-0">
                {displayName}
              </h3>
              <p className="text-[14px] text-slate-600 leading-tight mt-0.5">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5 px-2 py-1.5 text-xs flex-shrink-0 h-auto"
          >
            <IdCard className="w-3.5 h-3.5" />
            <span className="text-xs">Manage Profile</span>
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-4">
          <p className="text-[13px] font-medium text-slate-700 mb-1.5">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0052CC] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-[#10B981] hover:bg-[#10B981] text-white px-3 py-1 rounded-full text-[12px] font-semibold">
            Active
          </Badge>
          <Badge className="bg-[#0052CC] hover:bg-[#0052CC] text-white px-3 py-1 rounded-full text-[12px] font-semibold">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border-2 border-[#0052CC] text-[#0052CC] bg-white hover:bg-white px-3 py-1 rounded-full text-[12px] font-semibold"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-0">
          {employee.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-[13px] truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-[13px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div 
        className="bg-gradient-to-r from-[#0ea5e9] to-[#0052CC] px-5 py-3.5 cursor-pointer hover:from-[#0284c7] hover:to-[#003d99] transition-all" 
        onClick={() => onViewDetails(employee)}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-white font-bold text-[15px]">Add New</span>
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
            <Plus className="w-4 h-4 text-[#0052CC]" />
          </div>
        </div>
      </div>
    </Card>
  );
}