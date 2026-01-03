import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, MessageSquare, Image as ImageIcon, Calendar, User, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/toast';

export default function ClientTasksView({ jobId, clientEmail, clientName }) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [selectedTask, setSelectedTask] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Fetch only client-visible tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['client-tasks', jobId],
    queryFn: () => base44.entities.Task.filter({ 
      job_id: jobId,
      visible_to_client: true 
    }, '-created_date'),
    enabled: !!jobId,
  });

  // Fetch comments for selected task
  const { data: comments = [] } = useQuery({
    queryKey: ['client-task-comments', selectedTask?.id],
    queryFn: () => base44.entities.ClientTaskComment.filter({ 
      task_id: selectedTask.id 
    }, 'created_date'),
    enabled: !!selectedTask?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientTaskComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-task-comments', selectedTask?.id] });
      setNewComment('');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTask) return;
    
    createCommentMutation.mutate({
      task_id: selectedTask.id,
      job_id: jobId,
      comment: newComment.trim(),
      author_email: clientEmail,
      author_name: clientName,
      is_client: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'checklist': return '✅';
      case 'inspection': return '🔍';
      default: return '📋';
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/functions/generateTaskReportPDF?jobId=${jobId}`);
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-report-${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      success('PDF downloaded');
    } catch (err) {
      error('Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with PDF Download */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tasks & Updates</h3>
        <Button
          onClick={handleDownloadPDF}
          disabled={downloadingPDF || tasks.length === 0}
          variant="outline"
          size="sm"
          className="border-slate-300 dark:border-slate-600"
        >
          <Download className="w-4 h-4 mr-2" />
          {downloadingPDF ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tasks available for review</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const commentsCount = comments.filter(c => c.task_id === task.id).length;
            
            return (
              <Card 
                key={task.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => setSelectedTask(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getTypeIcon(task.task_type)}</span>
                        <CardTitle className="text-base">{task.title}</CardTitle>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Badge className={`${getStatusColor(task.status)} border px-3 py-1`}>
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.due_date), 'MMM dd')}
                      </div>
                    )}
                    {task.assigned_to && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Assigned
                      </div>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <MessageSquare className="w-3 h-3" />
                      <span>{commentsCount || 0}</span>
                    </div>
                  </div>
                  
                  {task.photo_urls?.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{task.photo_urls.length} photos</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{getTypeIcon(selectedTask?.task_type)}</span>
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Task Details - Client-safe only */}
            <div className="space-y-3">
              {selectedTask?.description && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              
              {/* SECURITY: Internal notes are NEVER shown to clients */}

              <div className="flex items-center gap-4">
                <Badge className={`${getStatusColor(selectedTask?.status)} border`}>
                  {selectedTask?.status}
                </Badge>
                {selectedTask?.due_date && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    Due: {format(new Date(selectedTask.due_date), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>

              {/* Photos */}
              {selectedTask?.photo_urls?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedTask.photo_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist Preview (read-only for clients) */}
              {selectedTask?.checklist?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Checklist Progress</p>
                  <div className="space-y-1.5">
                    {selectedTask.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                        <span className={item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comments & Questions</p>
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                Client Comments Enabled
              </Badge>
            </div>
              
              {/* Comments List */}
              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        comment.is_client ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {comment.author_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {comment.author_name}
                          </span>
                          {comment.is_client && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                              Client
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {format(new Date(comment.created_date), 'MMM dd, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {comment.comment}
                        </p>
                        {comment.attachments?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {comment.attachments.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Attachment ${idx + 1}`}
                                className="w-16 h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
                )}
              </div>

              {/* Add Comment Input */}
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or question..."
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
                  >
                    {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}