import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, Mail, X, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export default function ClientInviteManager({ jobId, jobName }) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user can invite clients
  const canInviteClients = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase();
    const position = currentUser.position?.toLowerCase() || '';
    
    return (
      role === 'admin' ||
      role === 'ceo' ||
      role === 'manager' ||
      position.includes('manager')
    );
  };

  // Fetch existing project members
  const { data: members = [] } = useQuery({
    queryKey: ['project-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId,
  });

  const clients = members.filter(m => m.role === 'client');

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // Create project member
      await base44.entities.ProjectMember.create(data);
      
      // Send invitation email
      await base44.integrations.Core.SendEmail({
        to: data.user_email,
        subject: `Invitation to View Project: ${jobName}`,
        body: `
Hello ${data.user_name},

You've been invited to view the project "${jobName}" through our Client Portal.

Click here to access your project:
${window.location.origin}/ClientPortal

You'll be able to:
- View project progress and tasks
- See photos and updates
- Chat with the project team
- Download reports and documents

If you don't have an account yet, you'll be prompted to create one.

Best regards,
MCI Team
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', jobId] });
      setShowDialog(false);
      setClientEmail('');
      setClientName('');
      success('Client invited successfully');
    },
    onError: () => {
      error('Failed to invite client');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId) => base44.entities.ProjectMember.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', jobId] });
      success('Client access revoked');
    },
  });

  const handleInvite = () => {
    if (!clientEmail.trim() || !clientName.trim()) return;

    inviteMutation.mutate({
      project_id: jobId,
      user_email: clientEmail.trim().toLowerCase(),
      user_name: clientName.trim(),
      role: 'client',
      permissions: ['view_tasks', 'comment_tasks', 'view_photos', 'chat'],
    });
  };

  if (!canInviteClients()) {
    return null;
  }

  return (
    <div>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Invite Client ({clients.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Invite Client to Project
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Existing Clients */}
            {clients.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Current Clients</p>
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {client.user_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {client.user_name}
                          </p>
                          <p className="text-xs text-slate-500">{client.user_email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMutation.mutate(client.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Form */}
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Client Name
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Smith"
                className="mb-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Client Email
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@company.com"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                ✓ View project tasks and progress<br />
                ✓ Comment on tasks and updates<br />
                ✓ Access photos and documents<br />
                ✓ Chat with project team<br />
                ✗ Cannot edit or create tasks
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!clientEmail.trim() || !clientName.trim() || inviteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                {inviteMutation.isPending ? (
                  'Inviting...'
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}