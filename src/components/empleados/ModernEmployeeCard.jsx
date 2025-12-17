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
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full min-w-[320px] max-w-[360px]">
      <div className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-[48px] h-[48px] rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-[48px] h-[48px] bg-[#1E6FE8] rounded-full flex items-center justify-center text-white font-bold text-[19px] flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5">
                {displayName}
              </h3>
              <p className="text-[11px] text-[#666666] leading-tight">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
          >
            <IdCard className="w-3 h-3" />
            <span className="text-[10px] font-medium">Manage Profile</span>
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-[#666666] mb-1.5">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-[3px] bg-[#E0E0E0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E6FE8] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className="bg-[#00C48C] hover:bg-[#00C48C] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Active
          </Badge>
          <Badge className="bg-[#1E6FE8] hover:bg-[#1E6FE8] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-0">
          {employee.email && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Mail className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px] truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Phone className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div 
        className="bg-gradient-to-r from-[#1E6FE8] to-[#0052CC] h-[40px] cursor-pointer hover:from-[#1557C0] hover:to-[#003d99] transition-all flex items-center justify-center" 
        onClick={() => onViewDetails(employee)}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-white font-bold text-[12px]">Add New</span>
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <Plus className="w-3 h-3 text-[#1E6FE8]" />
          </div>
        </div>
      </div>
    </Card>
  );
}