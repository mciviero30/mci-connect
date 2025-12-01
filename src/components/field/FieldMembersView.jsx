import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  UserPlus, 
  Shield, 
  User, 
  Users,
  Mail,
  MoreVertical,
  Trash2,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const roleColors = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  collaborator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  client: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const roleIcons = {
  admin: Crown,
  collaborator: User,
  client: Users,
};

export default function FieldMembersView({ jobId }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'collaborator' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['field-invitations', jobId],
    queryFn: () => base44.entities.ProjectInvitation.filter({ project_id: jobId, status: 'pending' }),
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // Create invitation token
      const token = Math.random().toString(36).substring(2, 15);
      return base44.entities.ProjectInvitation.create({
        project_id: jobId,
        invited_email: data.email,
        invited_name: data.name,
        role: data.role,
        invited_by: user?.email,
        invited_by_name: user?.full_name,
        invitation_token: token,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-invitations', jobId] });
      setShowInvite(false);
      setInviteData({ email: '', name: '', role: 'collaborator' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-members', jobId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.ProjectMember.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-members', jobId] });
    },
  });

  const handleInvite = () => {
    if (!inviteData.email) return;
    inviteMutation.mutate(inviteData);
  };

  // Group members by role
  const admins = members.filter(m => m.role === 'admin');
  const collaborators = members.filter(m => m.role === 'collaborator');
  const clients = members.filter(m => m.role === 'client');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#D4C85C]">Equipo del Proyecto</h1>
        <Button 
          onClick={() => setShowInvite(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Miembro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{admins.length}</p>
              <p className="text-sm text-purple-400">Administradores</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{collaborators.length}</p>
              <p className="text-sm text-blue-400">Colaboradores</p>
            </div>
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
              <p className="text-sm text-green-400">Clientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Invitaciones Pendientes</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div 
                key={inv.id}
                className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{inv.invited_name || inv.invited_email}</p>
                    <p className="text-sm text-slate-400">{inv.invited_email}</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Pendiente
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role] || User;
          return (
            <div 
              key={member.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {(member.user_name || member.user_email)?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">{member.user_name || member.user_email}</p>
                  <p className="text-sm text-slate-400">{member.user_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={roleColors[member.role]}>
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {member.role === 'admin' ? 'Admin' : 
                   member.role === 'collaborator' ? 'Colaborador' : 'Cliente'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => updateRoleMutation.mutate({ id: member.id, role: 'admin' })}
                      className="text-white"
                    >
                      <Crown className="w-4 h-4 mr-2 text-purple-400" />
                      Hacer Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => updateRoleMutation.mutate({ id: member.id, role: 'collaborator' })}
                      className="text-white"
                    >
                      <User className="w-4 h-4 mr-2 text-blue-400" />
                      Colaborador
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => removeMemberMutation.mutate(member.id)}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Sin miembros</h3>
          <p className="text-slate-400 mb-4">Invita a tu equipo al proyecto</p>
          <Button 
            onClick={() => setShowInvite(true)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar Miembro
          </Button>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Invitar Miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input 
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                placeholder="usuario@ejemplo.com"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Nombre (opcional)</Label>
              <Input 
                value={inviteData.name}
                onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                placeholder="Juan García"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Rol</Label>
              <Select value={inviteData.role} onValueChange={(v) => setInviteData({...inviteData, role: v})}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="admin" className="text-white">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="collaborator" className="text-white">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      Colaborador
                    </div>
                  </SelectItem>
                  <SelectItem value="client" className="text-white">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-400" />
                      Cliente (solo lectura)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInvite(false)} className="border-slate-700 text-slate-300">
                Cancelar
              </Button>
              <Button 
                onClick={handleInvite}
                disabled={!inviteData.email || inviteMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {inviteMutation.isPending ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}