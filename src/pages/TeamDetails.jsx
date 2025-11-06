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
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={team.team_name}
          description={`${team.location}, ${team.state}`}
          icon={Building2}
          showBack={true}
          actions={
            team.is_headquarters && (
              <Badge className="bg-amber-500/20 border-amber-500 text-amber-400 text-lg px-4 py-2">
                Headquarters
              </Badge>
            )
          }
        />

        {team.description && (
          <Card className="glass-card shadow-xl mb-6">
            <CardContent className="p-6">
              <p className="text-slate-300 text-lg">{team.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="glass-card shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-slate-200">
                <Users className="w-5 h-5 text-[#3B9FF3]" />
                Team Members ({teamEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {teamEmployees.length > 0 ? (
                <div className="space-y-4">
                  {teamEmployees.map(emp => (
                    <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                      <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all border border-slate-700 hover:border-[#3B9FF3]/30">
                        {emp.profile_photo_url ? (
                          <img src={emp.profile_photo_url} alt={emp.full_name} className="w-14 h-14 rounded-full object-cover border-2 border-[#3B9FF3]/30" />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {emp.full_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-white">{emp.full_name}</h3>
                          <p className="text-sm text-cyan-400">{emp.position || 'No position'}</p>
                          {emp.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <Mail className="w-3 h-3" />
                              <span>{emp.email}</span>
                            </div>
                          )}
                          {emp.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <Phone className="w-3 h-3" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                        </div>
                        {emp.department && (
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {emp.department}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No employees in this team</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-slate-200">
                <Briefcase className="w-5 h-5 text-[#3B9FF3]" />
                Active Jobs ({teamJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {teamJobs.length > 0 ? (
                <div className="space-y-4">
                  {teamJobs.map(job => (
                    <Link key={job.id} to={createPageUrl(`JobDetails?id=${job.id}`)}>
                      <div className="p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all border border-slate-700 hover:border-[#3B9FF3]/30">
                        <h3 className="font-bold text-white text-lg mb-2">{job.name}</h3>
                        {job.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{job.address}</span>
                          </div>
                        )}
                        {job.contract_amount && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#3B9FF3]">
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