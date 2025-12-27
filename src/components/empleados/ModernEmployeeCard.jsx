import React, { useState, useEffect } from "react";
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
  const [profileImage, setProfileImage] = useState(
    employee.preferred_profile_image === 'avatar' && employee.avatar_image_url
      ? employee.avatar_image_url
      : employee.profile_photo_url
  );

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      const timestamp = localStorage.getItem('profile_timestamp');
      if (timestamp) {
        // Force re-render with new timestamp
        const newImage = employee.preferred_profile_image === 'avatar' && employee.avatar_image_url
          ? `${employee.avatar_image_url}?v=${timestamp}`
          : employee.profile_photo_url ? `${employee.profile_photo_url}?v=${timestamp}` : null;
        setProfileImage(newImage);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [employee.email, employee.avatar_image_url, employee.profile_photo_url, employee.preferred_profile_image]);

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

  // Load team name if team_id exists but team_name is missing
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
    staleTime: 300000,
    enabled: !!employee.team_id && !employee.team_name
  });

  const teamName = employee.team_name || 
    (employee.team_id ? teams.find(t => t.id === employee.team_id)?.team_name : null);

  const teamLocation = teamName 
    ? `Team: ${teamName}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;

  return (
    <Card className="bg-white dark:bg-[#282828] rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation">
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-start gap-2 sm:gap-2.5">
            {profileImage ? (
              <img
                key={employee.profile_last_updated || employee.id}
                src={profileImage}
                alt={displayName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 shadow-md">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base md:text-[16px] font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5">
                {displayName}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#666666] dark:text-slate-400 leading-tight">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
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
              className="bg-[#F5F5F5] dark:bg-slate-700 hover:bg-[#E8E8E8] dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg min-h-[36px] sm:h-[26px] flex-shrink-0 touch-manipulation active:scale-95"
            >
              <IdCard className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Manage</span>
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
              className="h-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className="bg-blue-50/60 text-slate-900 dark:text-slate-900 border border-blue-200/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Active
          </Badge>
          <Badge className="bg-blue-50/60 text-slate-900 dark:text-slate-900 border border-blue-200/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border border-[#507DB4]/40 text-[#507DB4] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
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
      <div className="h-[3px] bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
    </Card>
  );
}