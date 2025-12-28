import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function ClientInvitationManager({ open, onClose, jobId, jobName }) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Fetch existing client members for this project
  const { data: clientMembers = [] } = useQuery({
    queryKey: ['project-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      project_id: jobId,
      role: 'client'
    }),
    enabled: !!jobId && open,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => base44.entities.ProjectMember.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', jobId] });
      success('Cliente removido del proyecto');
    },
  });

  const handleInvite = async () => {
    if (!email.trim()) {
      error('Ingresa un email válido');
      return;
    }

    setInviting(true);
    try {
      // Step 1: Invite user to the system
      await base44.users.inviteUser(email.trim(), 'user');
      
      // Step 2: Add as client member to this project
      await base44.entities.ProjectMember.create({
        user_email: email.trim(),
        project_id: jobId,
        role: 'client',
        status: 'active',
        invited_by: (await base44.auth.me()).email,
        invited_date: new Date().toISOString()
      });

      success('Cliente invitado exitosamente');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['project-members', jobId] });
    } catch (err) {
      error(err.message || 'Error al invitar cliente');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Invitar Clientes al Proyecto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">{jobName}</p>
            <p className="text-xs text-blue-600">Los clientes verán el progreso en tiempo real</p>
          </div>

          {/* Invite Form */}
          <div className="space-y-3">
            <Label>Email del Cliente</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="flex-1"
              />
              <Button 
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {inviting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Invitando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Invitar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              El cliente recibirá un email para crear su cuenta y acceder al portal
            </p>
          </div>

          {/* Existing Members */}
          {clientMembers.length > 0 && (
            <div className="space-y-3">
              <Label>Clientes con Acceso ({clientMembers.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clientMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {member.user_email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.user_email}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Acceso activo
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('¿Remover acceso de este cliente?')) {
                          removeMemberMutation.mutate(member.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
            <p className="text-sm font-medium text-slate-900">¿Qué pueden ver los clientes?</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>✓ Progreso de tareas en tiempo real</li>
              <li>✓ Galería de fotos del proyecto</li>
              <li>✓ Documentos compartidos</li>
              <li>✓ Reportes generados</li>
              <li>✗ No pueden editar información</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}