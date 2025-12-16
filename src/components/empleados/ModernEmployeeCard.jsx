import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Eye, Edit } from "lucide-react";
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

  const teamLocation = employee.team_name 
    ? `${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;
  const isOfficeReady = progressPercentage >= 100;

  return (
    <Card className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start gap-4 mb-6">
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-4 border-blue-500/20 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-md">
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-slate-900 truncate mb-1">
              {displayName}
            </h3>
            <p className="text-slate-600 text-base mb-2">
              {employee.position || 'Employee'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Manage Profile
            </Button>
          </div>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              Onboarding Complete: {progressPercentage}%
            </span>
            {isOfficeReady && (
              <Badge className="bg-green-500 text-white">Office Ready</Badge>
            )}
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 mb-5">
          <Badge className="bg-green-500 text-white px-4 py-1.5 rounded-full">
            {employee.employment_status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
          <Badge className="bg-blue-600 text-white px-4 py-1.5 rounded-full">
            Full-Time
          </Badge>
          <Badge 
            variant="outline" 
            className="border-2 border-blue-500 text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full font-medium"
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2.5 mb-5">
          {employee.email && (
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{employee.phone}</span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <Button
          onClick={() => onViewDetails(employee)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <Eye className="w-5 h-5 mr-2" />
          View Onboarding Details
        </Button>
      </div>
    </Card>
  );
}