import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatPosition } from "@/components/utils/nameHelpers";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PendingInvitationCard({ employee }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showTeamSelect, setShowTeamSelect] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
    staleTime: 60000
  });

  const displayName = (() => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (employee.full_name && !employee.full_name.includes('@')) {
      return employee.full_name;
    }
    return employee.email?.split('@')[0].split('.').map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join(' ') || 'Unknown';
  })();

  const updateTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const selectedTeam = teams.find(t => t.id === teamId);
      await base44.entities.PendingEmployee.update(employee.id, {
        team_id: teamId,
        team_name: selectedTeam?.team_name || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      setShowTeamSelect(false);
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const fullName = displayName;
      
      // Send welcome email from our app
      await base44.functions.invoke('sendInvitationEmail', {
        to: employee.email,
        fullName,
        language
      });

      // Invite user to Base44 system (sends Base44 invitation email automatically)
      await base44.users.inviteUser(employee.email, 'user');
      
      // Update status to invited
      await base44.entities.PendingEmployee.update(employee.id, { 
        status: 'invited',
        last_invitation_sent: new Date().toISOString(),
        invitation_count: (employee.invitation_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      alert(language === 'es' 
        ? 'Invitación enviada! El empleado recibirá 2 emails: bienvenida + invitación de Base44'
        : 'Invitation sent! Employee will receive 2 emails: welcome + Base44 system invite'
      );
    },
    onError: (error) => {
      console.error('Error sending invitation:', error);
      alert(language === 'es' 
        ? 'Error al enviar invitación: ' + error.message
        : 'Error sending invitation: ' + error.message
      );
    }
  });

  const teamLocation = employee.team_name 
    ? `Team: ${employee.team_name}`
    : 'No Team Assigned';

  return (
    <Card className="bg-white dark:bg-[#282828] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col">
      <div className="p-4 flex flex-col flex-1">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-12 h-12 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
              {displayName[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white leading-tight mb-0.5">
                {displayName}
              </h3>
              <p className="text-xs text-[#666666] dark:text-slate-400 leading-tight">
                {formatPosition(employee.position)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg h-[26px] flex-shrink-0 touch-manipulation active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">
              {inviteMutation.isPending ? 'Sending...' : 'Invite'}
            </span>
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <Badge className="bg-yellow-50/60 text-yellow-900 border border-yellow-200/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center">
            Pending Invitation
          </Badge>
          
          {showTeamSelect ? (
            <Select value={employee.team_id || ''} onValueChange={(value) => updateTeamMutation.mutate(value)}>
              <SelectTrigger className="h-[26px] w-[140px] text-[10px] border-[#507DB4]/40">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id} className="text-[11px]">
                    {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge 
              variant="outline" 
              onClick={() => setShowTeamSelect(true)}
              className="border border-[#507DB4]/40 text-[#507DB4] bg-transparent hover:bg-[#507DB4]/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center cursor-pointer"
            >
              {teamLocation}
            </Badge>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mt-auto">
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
      <div className="h-[3px] bg-gradient-to-r from-yellow-400 to-yellow-600" />
    </Card>
  );
}