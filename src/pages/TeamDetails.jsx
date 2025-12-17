import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Briefcase, MapPin, Mail, Phone, DollarSign, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/shared/PageHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";

export default function TeamDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');

  const { data: team, isLoading: loadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const teams = await base44.entities.Team.list();
      return teams.find(t => t.id === teamId);
    },
    enabled: !!teamId,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('name'),
    initialData: [],
  });

  if (loadingTeam || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const teamEmployees = employees.filter(e => {
    const isInTeam = (e.team_id === teamId || e.team_name === team.team_name);
    const isActive = !e.employment_status || e.employment_status === 'active';
    return isInTeam && isActive;
  });

  const teamJobs = jobs.filter(j => 
    (j.team_id === teamId || j.team_name === team.team_name) && 
    j.status === 'active'
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={team.team_name}
          description={`${team.location}, ${team.state}`}
          icon={Building2}
          showBack={true}
          actions={
            team.is_headquarters && (
              <Badge className="bg-amber-100 border-amber-200 text-amber-700 text-sm px-3 py-1">
                Headquarters
              </Badge>
            )
          }
        />

        {team.description && (
          <Card className="bg-white shadow-md border-slate-200 mb-6">
            <CardContent className="p-6">
              <p className="text-slate-700 text-base">{team.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white shadow-md border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-blue-600" />
                Team Members ({teamEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {teamEmployees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamEmployees.map(emp => (
                    <ModernEmployeeCard
                      key={emp.id}
                      employee={emp}
                      onboardingProgress={{ percentage: 100, completed: 0, total: 0 }}
                      onViewDetails={() => navigate(createPageUrl(`EmployeeProfile?id=${emp.id}`))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No employees in this team</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Active Jobs ({teamJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {teamJobs.length > 0 ? (
                <div className="space-y-4">
                  {teamJobs.map(job => (
                    <Link key={job.id} to={createPageUrl(`JobDetails?id=${job.id}`)}>
                      <div className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:border-blue-300">
                        <h3 className="font-bold text-slate-900 text-base mb-2">{job.name}</h3>
                        {job.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{job.address}</span>
                          </div>
                        )}
                        {job.contract_amount && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                            <DollarSign className="w-4 h-4" />
                            <span>${job.contract_amount.toLocaleString('en-US')}</span>
                          </div>
                        )}
                        {job.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{job.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No active jobs for this team</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}