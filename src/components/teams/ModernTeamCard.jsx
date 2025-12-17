import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Briefcase, Plus, Building2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function ModernTeamCard({ team, stats, onViewDetails }) {
  const navigate = useNavigate();

  const maxHeadcount = team.maximum_headcount || 10;
  const capacityPercentage = (stats.employees / maxHeadcount) * 100;

  return (
    <Card className="bg-white rounded-[16px] shadow-[0px_8px_24px_rgba(0,0,0,0.05)] border-0 overflow-hidden hover:shadow-[0px_10px_28px_rgba(0,0,0,0.08)] transition-all duration-300 w-full">
      <div className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            <div className="w-[48px] h-[48px] bg-[#1E6FE8] rounded-full flex items-center justify-center text-white font-bold text-[19px] flex-shrink-0">
              {team.team_name?.[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-[#1A1A1A] leading-tight mb-0.5">
                {team.team_name}
              </h3>
              <p className="text-[11px] text-[#666666] leading-tight flex items-center gap-1">
                <MapPin className="w-[11px] h-[11px]" />
                {team.location}, {team.state}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl(`TeamDetails?id=${team.id}`))}
            className="bg-[#F5F5F5] hover:bg-[#E8E8E8] text-slate-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0"
          >
            <Building2 className="w-3 h-3" />
            <span className="text-[10px] font-medium">View Team</span>
          </Button>
        </div>

        {/* Capacity Progress */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-[#666666] mb-1.5">
            Team Capacity: {stats.employees}/{maxHeadcount}
          </p>
          <div className="w-full h-[3px] bg-[#E0E0E0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                capacityPercentage >= 100 ? 'bg-red-500' :
                capacityPercentage > 80 ? 'bg-amber-500' : 'bg-[#1E6FE8]'
              }`}
              style={{ width: `${Math.min(100, capacityPercentage)}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className="bg-[#00C48C] hover:bg-[#00C48C] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Active
          </Badge>
          {team.is_headquarters && (
            <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
              HQ
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="border border-[#1E6FE8] text-[#1E6FE8] bg-transparent hover:bg-transparent px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center"
          >
            {stats.employees} Members
          </Badge>
        </div>

        {/* Stats Info */}
        <div className="space-y-1.5 mb-0">
          <div className="flex items-center gap-1.5 text-[#666666]">
            <Users className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-[10px]">{stats.employees} Employees</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#666666]">
            <Briefcase className="w-[13px] h-[13px] text-slate-400 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-[10px]">{stats.jobs} Active Jobs</span>
          </div>
        </div>
      </div>

      {/* Add New Button - Full Width at Bottom */}
      <div 
        className="bg-gradient-to-r from-[#1E6FE8] to-[#0052CC] h-[40px] cursor-pointer hover:from-[#1557C0] hover:to-[#003d99] transition-all flex items-center justify-center" 
        onClick={() => onViewDetails(team)}
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