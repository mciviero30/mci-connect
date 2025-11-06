import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ExternalLink,
  Copy,
  Mail,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function ClientAccessManager({ job }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  // Get existing access records for this job
  const { data: accessRecords = [], isLoading } = useQuery({
    queryKey: ['clientAccess', job.id],
    queryFn: () => base44.entities.ClientPortalAccess.filter({ job_id: job.id }, '-created_date'),
    initialData: []
  });

  // Create new access
  const createAccessMutation = useMutation({
    mutationFn: async (email) => {
      // Generate unique token
      const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const baseUrl = window.location.origin;
      const accessUrl = `${baseUrl}/#/ClientPortal?token=${token}`;

      const accessData = {
        job_id: job.id,
        job_name: job.name,
        customer_id: job.customer_id || '',
        customer_name: job.customer_name || 'Client',
        customer_email: email,
        access_token: token,
        access_url: accessUrl,
        is_active: true,
        created_by_email: user.email,
        created_by_name: user.full_name,
        access_count: 0
      };

      return base44.entities.ClientPortalAccess.create(accessData);
    },
    onSuccess: (newAccess) => {
      queryClient.invalidateQueries({ queryKey: ['clientAccess'] });
      setShowCreateDialog(false);
      setCustomerEmail('');
      toast({
        title: "✅ Client Access Created",
        description: `Access link generated for ${newAccess.customer_email}`
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: `Failed to create access: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Toggle access active status
  const toggleAccessMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.ClientPortalAccess.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientAccess'] });
      toast({
        title: "✅ Access Updated",
        description: "Client access status changed"
      });
    }
  });

  // Delete access
  const deleteAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPortalAccess.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientAccess'] });
      toast({
        title: "✅ Access Deleted",
        description: "Client access has been removed"
      });
    }
  });

  // Copy link to clipboard
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "✅ Link Copied",
      description: "Client portal link copied to clipboard"
    });
  };

  // Send email with access link
  const sendAccessEmail = async (access) => {
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        from_name: 'MCI Connect',
        to: access.customer_email,
        subject: `Your MCI Project Portal Access - ${job.name}`,
        body: `
Dear ${access.customer_name},

Thank you for choosing MCI for your project: ${job.name}.

We're excited to provide you with 24/7 access to your project portal, where you can:

• View interactive blueprints with real-time task tracking
• See project progress and completion status
• Browse photo documentation of completed work
• Track project milestones

Access your portal here:
${access.access_url}

This link is unique to your project and can be accessed at any time. Feel free to bookmark it for easy access.

If you have any questions about your project or need assistance accessing the portal, please don't hesitate to contact your project manager.

Best regards,
MCI Team

---
This is an automated message from MCI Connect.
        `.trim()
      });

      toast({
        title: "✅ Email Sent",
        description: `Access link sent to ${access.customer_email}`
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateAccess = () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      toast({
        title: "❌ Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    createAccessMutation.mutate(customerEmail);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#3B9FF3]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Client Portal Access</h3>
          <p className="text-sm text-slate-600">
            Manage client access links for 24/7 project transparency
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Access Link
        </Button>
      </div>

      {/* Access Records List */}
      {accessRecords.length === 0 ? (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-8 text-center">
            <ExternalLink className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">
              No client access links created yet. Create one to give your client 24/7 portal access.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="bg-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Access Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accessRecords.map((access) => (
            <Card key={access.id} className="bg-white border-slate-200 hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-slate-900">{access.customer_name}</p>
                      <Badge className={access.is_active ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'}>
                        {access.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{access.customer_email}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {access.access_count || 0} views
                      </span>
                      {access.last_accessed && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {format(new Date(access.last_accessed), 'MMM dd, yyyy')}
                        </span>
                      )}
                      <span>
                        Created: {format(new Date(access.created_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(access.access_url)}
                      className="bg-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendAccessEmail(access)}
                      disabled={sendingEmail}
                      className="bg-white"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(access.access_url, '_blank')}
                      className="bg-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAccessMutation.mutate({ id: access.id, isActive: access.is_active })}
                      className="bg-white"
                    >
                      {access.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this access link?')) {
                          deleteAccessMutation.mutate(access.id);
                        }
                      }}
                      className="bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Access Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create Client Portal Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="customer-email">Client Email Address *</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                The client will receive an email with their unique access link
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                <strong>Client will have access to:</strong>
              </p>
              <ul className="text-sm text-slate-600 mt-2 space-y-1 ml-4 list-disc">
                <li>Project overview and progress</li>
                <li>Interactive blueprints with task tracking</li>
                <li>Photo gallery of completed work</li>
                <li>Real-time status updates</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setCustomerEmail('');
              }}
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccess}
              disabled={createAccessMutation.isPending || !customerEmail}
              className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
            >
              {createAccessMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Create Access Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}