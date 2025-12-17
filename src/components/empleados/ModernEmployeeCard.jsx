import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, IdCard, Plus, Shield, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatPosition } from "@/components/utils/nameHelpers";

export default function ModernEmployeeCard({ employee, onboardingProgress, onViewDetails }) {
  const navigate = useNavigate();

  // Lazy load certifications only when needed
  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications', employee.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: employee.email }),
    initialData: [],
    staleTime: 300000, // 5 minutes
    enabled: false // Only fetch when component is visible
  });

  const hasOSHA30 = certifications.some(c => c.certification_type === 'osha_30' && c.status === 'active');
  const hasExpiredCerts = certifications.some(c => c.status === 'expired');

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

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;

  return (
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full flex flex-col h-full">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-[#1E6FE8] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
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

          <div className="flex items-center gap-1">
            {hasOSHA30 && (
              <div className="bg-green-100 p-1.5 rounded-full" title="OSHA 30 Certified">
                <Shield className="w-3.5 h-3.5 text-green-600" />
              </div>
            )}
            {hasExpiredCerts && (
              <div className="bg-red-100 p-1.5 rounded-full" title="Expired Certifications">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
              className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
            >
              <IdCard className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Manage Profile</span>
            </Button>
          </div>
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
        <div className="space-y-1.5 mb-0 mt-auto">
          {employee.email && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px] truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-1.5 text-[#666666]">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[10px]">{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Gradient Line at Bottom */}
      <div className="h-[3px] bg-gradient-to-r from-[#1E6FE8] to-[#0052CC]" />
    </Card>
  );
}