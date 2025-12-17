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
    <Card className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 w-full max-w-[300px]">
      <div className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-start gap-2.5">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-[58px] h-[58px] rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-[58px] h-[58px] bg-[#0052CC] rounded-full flex items-center justify-center text-white font-bold text-[28px] flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-[17px] font-bold text-black leading-[1.2] mb-0.5">
                {displayName}
              </h3>
              <p className="text-[13px] text-slate-600 leading-[1.3]">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1 px-2 py-1 text-[11px] flex-shrink-0 h-auto min-w-0"
          >
            <IdCard className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px] whitespace-nowrap">Manage Profile</span>
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-3.5">
          <p className="text-[12px] font-medium text-slate-700 mb-1.5">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0052CC] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3.5">
          <Badge className="bg-[#10B981] hover:bg-[#10B981] text-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold h-[26px] flex items-center">
            Active
          </Badge>
          <Badge className="bg-[#0052CC] hover:bg-[#0052CC] text-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold h-[26px] flex items-center">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border-2 border-[#0052CC] text-[#0052CC] bg-white hover:bg-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold h-[26px] flex items-center"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-0">
          {employee.email && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[12px] truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[12px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div 
        className="bg-gradient-to-r from-[#0ea5e9] to-[#0052CC] px-4 py-3 cursor-pointer hover:from-[#0284c7] hover:to-[#003d99] transition-all" 
        onClick={() => onViewDetails(employee)}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-white font-bold text-[14px]">Add New</span>
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <Plus className="w-3.5 h-3.5 text-[#0052CC]" />
          </div>
        </div>
      </div>
    </Card>
  );
}