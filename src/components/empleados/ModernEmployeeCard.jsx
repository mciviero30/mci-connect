import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, IdCard, Plus, Shield, AlertTriangle, Send } from "lucide-react";
import SwipeableListItem from '@/components/shared/SwipeableListItem';
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatPosition } from "@/components/utils/nameHelpers";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function ModernEmployeeCard({ employee, onboardingProgress, onViewDetails, showInviteButton, onInvite, isInviting }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
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

  // Normalize text helper
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const displayName = normalizeText((() => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (employee.full_name && !employee.full_name.includes('@')) {
      return employee.full_name;
    }
    // Fallback: extract from email but only capitalize first letter, not all letters
    return employee.email.split('@')[0].split('.').map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join(' ');
  })());

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
    <SwipeableListItem
      id={employee.id}
      onEdit={() => onViewDetails && onViewDetails(employee)}
      onDelete={() => {}}
    >
      <Card 
        onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
        className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-[16px] shadow-sm sm:shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 sm:border-0 overflow-hidden hover:shadow-md sm:hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 w-full flex flex-col h-full touch-manipulation cursor-pointer">
      <div className="p-4 flex-1 flex flex-col">
        {/* Header: Avatar + Name + Position */}
        <div className="flex items-start gap-3 mb-3">
          {profileImage ? (
            <img
              key={employee.profile_last_updated || employee.id}
              src={profileImage}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {displayName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {displayName}
            </h3>
            {employee.position && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {normalizeText(formatPosition(employee.position))}
              </p>
            )}
          </div>
        </div>

        {/* Position / Location Badges */}
        <div className="space-y-1.5 mb-3">
          {employee.position && (
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-700 dark:text-slate-300">{normalizeText(formatPosition(employee.position))}</span>
            </div>
          )}
          {teamName && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center text-slate-400 flex-shrink-0">
                <MapPin size={14} />
              </div>
              <Badge variant="outline" className="text-xs border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300 px-2 py-0.5">
                {teamName}
              </Badge>
            </div>
          )}
        </div>

        {/* Department / Team Info */}
        {employee.department && (
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 dark:text-slate-300">
            <Users size={14} className="flex-shrink-0 text-slate-400" />
            <span>{employee.department}</span>
          </div>
        )}

        {/* Phone Number */}
        {employee.phone && (
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 dark:text-slate-300">
            <Phone size={14} className="flex-shrink-0 text-slate-400" />
            <span>{employee.phone}</span>
          </div>
        )}

        {/* Email */}
        <div className="mt-auto">
          {employee.email && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Mail size={14} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{employee.email}</span>
            </div>
          )}
        </div>
      </div>

        {/* Gradient Line at Bottom */}
        <div className="h-[3px] bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
      </Card>
    </SwipeableListItem>
  );
}