import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users, 
  Plus, 
  Mail, 
  Eye, 
  Trash2, 
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Check,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationRulesManager from '@/components/client/NotificationRulesManager';

export default function ClientManagement() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['client-memberships-all'],
    queryFn: () => base44.entities.ProjectMember.filter({ role: 'client' }, '-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMembershipMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-memberships-all']);
      toast.success('Cliente invitado exitosamente');
      setInviteDialogOpen(false);
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-memberships-all']);
      toast.success('Acceso revocado');
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, 'user');
    },
    onSuccess: () => {
      toast.success('Invitación enviada por email');
    },
  });

  const [inviteForm, setInviteForm] = useState({
    user_email: '',
    user_name: '',
    project_id: '',
  });

  const handleInvite = async () => {
    if (!inviteForm.user_email || !inviteForm.user_name || !inviteForm.project_id) {
      toast.error('Completa todos los campos');
      return;
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === inviteForm.user_email);
    
    if (!existingUser) {
      // Invite to system first
      await inviteUserMutation.mutateAsync(inviteForm.user_email);
    }

    // Create project membership
    createMembershipMutation.mutate({
      project_id: inviteForm.project_id,
      user_email: inviteForm.user_email,
      user_name: inviteForm.user_name,
      role: 'client'
    });
  };

  const copyAccessLink = (projectId) => {
    const link = `${window.location.origin}${createPageUrl('ClientPortal')}?project=${projectId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(projectId);
    toast.success('Link copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getJobName = (projectId) => {
    return jobs.find(j => j.id === projectId)?.name || 'Job Unknown';
  };

  // Group memberships by project
  const projectGroups = memberships.reduce((acc, membership) => {
    if (!acc[membership.project_id]) {
      acc[membership.project_id] = [];
    }
    acc[membership.project_id].push(membership);
    return acc;
  }, {});

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Solo administradores pueden acceder</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Client Portal Manager"
          description="Gestiona invitaciones y accesos de clientes a proyectos"
          icon={Users}
          actions={
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Invitar Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invitar Cliente a Proyecto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Email del Cliente</Label>
                    <Input
                      type="email"
                      value={inviteForm.user_email}
                      onChange={(e) => setInviteForm({...inviteForm, user_email: e.target.value})}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div>
                    <Label>Nombre del Cliente</Label>
                    <Input
                      value={inviteForm.user_name}
                      onChange={(e) => setInviteForm({...inviteForm, user_name: e.target.value})}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <Label>Proyecto</Label>
                    <Select value={inviteForm.project_id} onValueChange={(val) => setInviteForm({...inviteForm, project_id: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map(job => (
                          <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleInvite} 
                    disabled={createMembershipMutation.isPending}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {createMembershipMutation.isPending ? 'Invitando...' : 'Enviar Invitación'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Clientes</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {new Set(memberships.map(m => m.user_email)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Proyectos Compartidos</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Object.keys(projectGroups).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <LinkIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Accesos Activos</p>
                  <p className="text-2xl font-bold text-slate-900">{memberships.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="clients">
              <Users className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Mail className="w-4 h-4 mr-2" />
              Automatización
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
          {Object.entries(projectGroups).map(([projectId, members]) => (
            <Card key={projectId}>
              <CardHeader className="border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getJobName(projectId)}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAccessLink(projectId)}
                    >
                      {copiedId === projectId ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(createPageUrl('ClientPortal'), '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {members.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {member.user_name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.user_name}</p>
                          <p className="text-sm text-slate-500">{member.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Cliente</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Revocar acceso de este cliente?')) {
                              deleteMembershipMutation.mutate(member.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(projectGroups).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No hay clientes invitados</p>
                <p className="text-sm text-slate-400 mb-6">
                  Comienza invitando clientes a tus proyectos para darles acceso al portal
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Invitar Primer Cliente
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
          </TabsContent>

          <TabsContent value="automation">
            <NotificationRulesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}