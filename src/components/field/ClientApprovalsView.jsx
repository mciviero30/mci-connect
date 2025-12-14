import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MessageSquare,
  Paperclip,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientApprovalsView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [newApproval, setNewApproval] = useState({
    title: '',
    description: '',
    client_email: '',
    client_name: '',
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ['client-approvals', jobId],
    queryFn: () => base44.entities.ClientApproval.filter({ job_id: jobId }, '-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['project-clients', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId, role: 'client' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientApproval.create({
      ...data,
      job_id: jobId,
      requested_by_email: user?.email,
      requested_by_name: user?.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-approvals', jobId] });
      setShowCreate(false);
      setNewApproval({ title: '', description: '', client_email: '', client_name: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientApproval.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-approvals', jobId] });
      setSelectedApproval(null);
    },
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Approved' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Rejected' };
      case 'revision_requested':
        return { icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Revision' };
      default:
        return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Pending' };
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Approvals</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Request Approval
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Rejected</p>
        </div>
      </div>

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No requests</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Request client approval for important milestones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map(approval => {
            const status = getStatusInfo(approval.status);
            const StatusIcon = status.icon;

            return (
              <div 
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${status.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{approval.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-1">{approval.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>For: {approval.client_name || approval.client_email}</span>
                        <span>•</span>
                        <span>{format(new Date(approval.created_date), "d MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${status.bg} ${status.color} border-0`}>
                    {status.label}
                  </Badge>
                </div>
                {approval.client_response && (
                  <div className="mt-3 p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">Response: </span>
                      {approval.client_response}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Title</Label>
              <Input
                value={newApproval.title}
                onChange={(e) => setNewApproval({ ...newApproval, title: e.target.value })}
                placeholder="e.g., Kitchen design approval"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={newApproval.description}
                onChange={(e) => setNewApproval({ ...newApproval, description: e.target.value })}
                placeholder="Details of what needs approval..."
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Client</Label>
              {clients.length > 0 ? (
                <select
                  value={newApproval.client_email}
                  onChange={(e) => {
                    const client = clients.find(c => c.user_email === e.target.value);
                    setNewApproval({
                      ...newApproval,
                      client_email: e.target.value,
                      client_name: client?.user_name || '',
                    });
                  }}
                  className="w-full mt-1.5 bg-slate-800 border border-slate-700 text-white rounded-md p-2"
                >
                  <option value="">Select client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.user_email}>
                      {client.user_name || client.user_email}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={newApproval.client_email}
                  onChange={(e) => setNewApproval({ ...newApproval, client_email: e.target.value })}
                  placeholder="Client email"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newApproval)}
                disabled={!newApproval.title}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Response Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          {selectedApproval && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApproval.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-slate-300">{selectedApproval.description}</p>
                
                {selectedApproval.status === 'pending' && user?.email === selectedApproval.client_email && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateMutation.mutate({
                        id: selectedApproval.id,
                        data: { status: 'approved', responded_at: new Date().toISOString() }
                      })}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => updateMutation.mutate({
                        id: selectedApproval.id,
                        data: { status: 'rejected', responded_at: new Date().toISOString() }
                      })}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {selectedApproval.responded_at && (
                  <p className="text-sm text-slate-500">
                    Responded: {format(new Date(selectedApproval.responded_at), "d MMM yyyy HH:mm")}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}