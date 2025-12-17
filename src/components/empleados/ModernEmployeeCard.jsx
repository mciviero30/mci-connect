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
    <Card className="bg-white rounded-[20px] shadow-[0px_10px_30px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_12px_35px_rgba(0,0,0,0.08)] transition-all duration-300 w-full min-w-[400px] max-w-[450px]">
      <div className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-[60px] h-[60px] bg-[#0052CC] rounded-full flex items-center justify-center text-white font-bold text-[24px] flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-[20px] font-bold text-[#1A1A1A] leading-tight mb-1">
                {displayName}
              </h3>
              <p className="text-[14px] text-[#666666] leading-tight">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1.5 px-3 py-2 rounded-lg h-[32px] flex-shrink-0"
          >
            <IdCard className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Manage Profile</span>
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-[#666666] mb-2">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-[4px] bg-[#E0E0E0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0052CC] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Badge className="bg-[#00B67A] hover:bg-[#00B67A] text-white px-3 py-1 rounded-full text-[12px] font-bold h-[28px] flex items-center">
            Active
          </Badge>
          <Badge className="bg-[#0052CC] hover:bg-[#0052CC] text-white px-3 py-1 rounded-full text-[12px] font-bold h-[28px] flex items-center">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border border-[#0052CC] text-[#0052CC] bg-transparent hover:bg-transparent px-3 py-1 rounded-full text-[12px] font-bold h-[28px] flex items-center"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-0">
          {employee.email && (
            <div className="flex items-center gap-2 text-[#666666]">
              <Mail className="w-[16px] h-[16px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[12px] truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-[#666666]">
              <Phone className="w-[16px] h-[16px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[12px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div 
        className="bg-[#0052CC] h-[50px] cursor-pointer hover:bg-[#003d99] transition-all flex items-center justify-center" 
        onClick={() => onViewDetails(employee)}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-white font-bold text-[14px]">Add New</span>
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-[#0052CC]" />
          </div>
        </div>
      </div>
    </Card>
  );
}