import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';

export default function ReviewKnowledge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pendingKnowledge = [] } = useQuery({
    queryKey: ['pending-knowledge'],
    queryFn: () => base44.entities.FieldKnowledge.filter({ 
      approval_status: 'pending' 
    }, '-created_date'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reason }) => 
      base44.entities.FieldKnowledge.update(id, {
        approval_status: status,
        reviewed_by: user.email,
        reviewed_by_name: user.full_name,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['field-knowledge-approved'] });
      setSelectedItem(null);
      setRejectReason('');
      toast.success('Review submitted');
    },
  });

  const isReviewer = user?.role === 'admin' || 
                     (user?.role || '').toLowerCase() === 'ceo' ||
                     (user?.role || '').toLowerCase() === 'manager';

  if (!isReviewer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only Admin, CEO, and Managers can review knowledge.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Review Knowledge"
          description="Review and approve field knowledge submissions"
          icon={Eye}
          stats={[{ label: 'Pending', value: pendingKnowledge.length }]}
        />

        {pendingKnowledge.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-slate-600">No pending knowledge to review</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingKnowledge.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>By {item.author_name}</span>
                      <Badge className="soft-slate-gradient text-xs">{item.category}</Badge>
                    </div>
                  </div>
                  <Badge className="soft-amber-gradient">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>

                <div className="prose prose-sm max-w-none mb-4">
                  <p className="text-slate-700">{item.content}</p>
                </div>

                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag, idx) => (
                      <Badge key={idx} className="soft-slate-gradient text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.photos?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {item.photos.map((url, idx) => (
                      <img key={idx} src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => reviewMutation.mutate({ id: item.id, status: 'approved' })}
                    className="flex-1 soft-green-gradient"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setSelectedItem(item)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Knowledge Tip</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason for rejection (will be sent to author)
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this tip cannot be approved..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => reviewMutation.mutate({ 
                id: selectedItem.id, 
                status: 'rejected', 
                reason: rejectReason 
              })}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}