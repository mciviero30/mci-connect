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

  // Format position with proper capitalization
  const formatPosition = (position) => {
    if (!position) return 'Employee';
    if (position === 'CEO') return 'Chief Executive Officer';
    // Capitalize each word
    return position.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  const progressPercentage = onboardingProgress?.percentage || 0;

  return (
    <Card className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        {/* Header Section - Avatar + Name + Manage Profile Button */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover shadow-md"
              />
            ) : (
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-md">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                {displayName}
              </h3>
              <p className="text-slate-600 text-lg mt-1">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`EmployeeProfile?id=${employee.id}`))}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 px-3 py-2"
          >
            <IdCard className="w-4 h-4" />
            Manage Profile
          </Button>
        </div>

        {/* Onboarding Progress */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Onboarding Complete: {progressPercentage}%
          </p>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Badges - Row 1 */}
        <div className="flex gap-2 mb-3">
          <Badge className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Active
          </Badge>
          <Badge className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Full-Time
          </Badge>
        </div>

        {/* Team Badge - Row 2 */}
        <div className="mb-5">
          <Badge 
            variant="outline" 
            className="border-2 border-blue-500 text-blue-700 bg-white px-4 py-1.5 rounded-full text-sm font-medium"
          >
            {teamLocation}
          </Badge>
        </div>

        {/* Contact Info - Two Columns */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {employee.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span className="text-sm truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span className="text-sm">{employee.phone}</span>
            </div>
          )}
        </div>

        {/* Add New Button */}
        <Button
          onClick={() => onViewDetails(employee)}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Add New
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}