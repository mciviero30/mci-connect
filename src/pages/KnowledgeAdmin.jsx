import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft,
  Eye,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

const categoryLabels = {
  solid_wall_systems: 'Solid Wall Systems',
  glass_wall_systems: 'Glass Wall Systems',
  doors: 'Doors',
  timber_lvl: 'Timber / LVL',
  millwork: 'Millwork',
  carpet: 'Carpet',
  general_installation: 'General Installation',
  field_tips: 'Field Tips'
};

const contentTypeLabels = {
  installation_guide: 'Installation Guide',
  system_overview: 'System Overview',
  field_tip: 'Field Tip'
};

export default function KnowledgeAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const userRole = (currentUser?.role || 'employee').toLowerCase();
  const canApprove = userRole === 'admin' || userRole === 'ceo' || userRole === 'manager';

  // Fetch pending articles
  const { data: pendingArticles = [], isLoading } = useQuery({
    queryKey: ['knowledge-pending'],
    queryFn: () => base44.entities.KnowledgeArticle.filter({ status: 'pending_approval' }, '-submitted_at')
  });

  // Fetch all articles (for history)
  const { data: allArticles = [] } = useQuery({
    queryKey: ['knowledge-all'],
    queryFn: () => base44.entities.KnowledgeArticle.list('-reviewed_at')
  });

  const approveMutation = useMutation({
    mutationFn: async (articleId) => {
      await base44.entities.KnowledgeArticle.update(articleId, {
        status: 'approved',
        approved_by: currentUser.email,
        approved_by_name: currentUser.full_name,
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-pending'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-all'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success('Article approved and published!');
      setSelectedArticle(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ articleId, reason }) => {
      await base44.entities.KnowledgeArticle.update(articleId, {
        status: 'rejected',
        approved_by: currentUser.email,
        approved_by_name: currentUser.full_name,
        approved_at: new Date().toISOString(),
        rejection_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-pending'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-all'] });
      toast.success('Article rejected');
      setSelectedArticle(null);
      setShowRejectDialog(false);
      setRejectionReason('');
    }
  });

  if (!canApprove) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Only administrators and managers can review knowledge submissions.
            </p>
            <Link to={createPageUrl('KnowledgeLibrary')}>
              <Button className="w-full">Go to Library</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvedArticles = allArticles.filter(a => a.status === 'approved');
  const rejectedArticles = allArticles.filter(a => a.status === 'rejected');

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('KnowledgeLibrary')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Knowledge Review Queue
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Approve or reject submitted content
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 shadow-md">
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingArticles.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approved ({approvedArticles.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected ({rejectedArticles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading submissions...</p>
              </div>
            ) : pendingArticles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No pending submissions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {pendingArticles.map((article) => (
                  <Card key={article.id} className="bg-white dark:bg-[#282828]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg text-slate-900 dark:text-white">
                          {article.title}
                        </CardTitle>
                        <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Submitted by {article.submitted_by_name} • {format(new Date(article.submitted_at), 'MMM dd, yyyy')}
                      </p>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category & Type</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{categoryLabels[article.category]}</Badge>
                          <Badge variant="secondary">{contentTypeLabels[article.content_type]}</Badge>
                          {article.model && (
                            <Badge variant="outline">{article.model}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{article.description}</p>
                      </div>
                      
                      {article.tags && article.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {article.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {article.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(article.file_url, '_blank')}
                          className="w-full"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Attachment
                        </Button>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => approveMutation.mutate(article.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedArticle(article);
                            setShowRejectDialog(true);
                          }}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            <div className="grid md:grid-cols-3 gap-4">
              {approvedArticles.map((article) => (
                <Card key={article.id} className="bg-white dark:bg-[#282828]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-900 dark:text-white">{article.title}</p>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Approved by {article.approved_by_name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rejected">
            <div className="grid md:grid-cols-2 gap-4">
              {rejectedArticles.map((article) => (
                <Card key={article.id} className="bg-white dark:bg-[#282828]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-900 dark:text-white">{article.title}</p>
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Reviewed by {article.approved_by_name}
                    </p>
                    {article.rejection_reason && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Reason: {article.rejection_reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please provide a reason for rejecting this submission. This will be shown to the submitter.
              </p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Information is inaccurate, needs more detail, duplicate content..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    rejectMutation.mutate({
                      articleId: selectedArticle.id,
                      reason: rejectionReason
                    });
                  }}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}