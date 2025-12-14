import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  X, 
  User, 
  Calendar, 
  Tag, 
  MessageSquare, 
  Paperclip,
  CheckSquare,
  Clock,
  AlertTriangle,
  Send,
  Trash2,
  Edit2,
  Save,
  Link2,
  MapPin,
  AtSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import TaskDependencies from './TaskDependencies.jsx';
import TaskChecklistEditor from './TaskChecklistEditor.jsx';
import OptimalAssigneeSuggestor from './OptimalAssigneeSuggestor.jsx';

export default function TaskDetailPanel({ task, onClose, onDelete, jobId, allTasks = [], onZoomTo, planImageUrl }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: task.id }, '-created_date'),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['task-attachments', task.id],
    queryFn: () => base44.entities.TaskAttachment.filter({ task_id: task.id }),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      setIsEditing(false);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
      setNewComment('');
    },
  });

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      if (onDelete) {
        await onDelete(task.id);
      } else {
        await base44.entities.Task.delete(task.id);
        queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
        onClose();
      }
    }
  };

  const handleSave = () => {
    updateTaskMutation.mutate(editedTask);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({
      task_id: task.id,
      comment: newComment,
      author_name: user?.full_name || 'Usuario',
    });
  };

  const handleMention = (email) => {
    setNewComment(prev => prev + `@${email.split('@')[0]} `);
    setShowMentions(false);
  };

  const handleChecklistChange = (newChecklist) => {
    updateTaskMutation.mutate({ checklist: newChecklist });
  };

  const handleStatusChange = (status) => {
    updateTaskMutation.mutate({ status });
  };

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Task Details</h3>
        <div className="flex items-center gap-2">
          {task.pin_x && task.pin_y && onZoomTo && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onZoomTo(task)} 
              className="text-[#FFB800] hover:text-[#FFB800]/80"
              title="Zoom to pin"
            >
              <MapPin className="w-4 h-4" />
            </Button>
          )}
          {isEditing ? (
            <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
              <Save className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        {isEditing ? (
          <Input 
            value={editedTask.title}
            onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        ) : (
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{task.title}</h4>
        )}

        {/* Mini Map - Location Preview */}
        {task.pin_x && task.pin_y && planImageUrl && (
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1 block">Location</label>
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
              <img 
                src={planImageUrl}
                alt="Plan preview"
                className="w-full h-full object-cover"
              />
              {/* Pin indicator */}
              <div 
                className="absolute w-3 h-3 bg-amber-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${task.pin_x}%`, top: `${task.pin_y}%` }}
              />
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1 block">Status</label>
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="pending" className="text-slate-900 dark:text-white">Pending</SelectItem>
              <SelectItem value="in_progress" className="text-slate-900 dark:text-white">In Progress</SelectItem>
              <SelectItem value="completed" className="text-slate-900 dark:text-white">Completed</SelectItem>
              <SelectItem value="blocked" className="text-slate-900 dark:text-white">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dependencies */}
        <TaskDependencies taskId={task.id} jobId={jobId} allTasks={allTasks} />

        {/* Priority */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1 block">Priority</label>
          {isEditing ? (
            <Select value={editedTask.priority} onValueChange={(v) => setEditedTask({...editedTask, priority: v})}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="low" className="text-slate-900 dark:text-white">Low</SelectItem>
                <SelectItem value="medium" className="text-slate-900 dark:text-white">Medium</SelectItem>
                <SelectItem value="high" className="text-slate-900 dark:text-white">High</SelectItem>
                <SelectItem value="urgent" className="text-slate-900 dark:text-white">Urgent</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={`${
              task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
              task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
              task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {task.priority}
            </Badge>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1 block">Description</label>
          {isEditing ? (
            <Textarea 
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              rows={3}
            />
          ) : (
            <p className="text-slate-700 dark:text-slate-300 text-sm">{task.description || 'No description'}</p>
          )}
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">{format(new Date(task.due_date), 'dd MMM yyyy')}</span>
          </div>
        )}

        {/* Assigned To */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1 block">Assigned To</label>
          <div className="flex items-center gap-2">
            {task.assigned_to || task.assignee_name ? (
              <div className="flex items-center gap-2 text-sm flex-1">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{task.assignee_name || task.assigned_to}</span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-500 text-sm flex-1">Unassigned</span>
            )}
            <OptimalAssigneeSuggestor 
              workUnitId={task.id}
              jobId={jobId}
              currentAssignee={task.assignee_email || task.assigned_to}
              onAssign={() => {
                queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
              }}
            />
          </div>
        </div>

        {/* Checklist - Enhanced */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 block flex items-center gap-2">
            <CheckSquare className="w-3 h-3" />
            Checklist
          </label>
          <TaskChecklistEditor 
            checklist={task.checklist || []}
            onChange={handleChecklistChange}
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 block">Attachments</label>
            <div className="space-y-2">
              {attachments.map((att) => (
                <a 
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{att.file_name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-2 block">
            Comments ({comments.length})
          </label>
          <div className="space-y-3 mb-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-600 dark:text-amber-400">{comment.author_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {format(new Date(comment.created_date), 'dd MMM HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{comment.comment}</p>
              </div>
            ))}
          </div>
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input 
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    if (e.target.value.endsWith('@')) {
                      setShowMentions(true);
                    }
                  }}
                  placeholder="Type @ to mention..."
                  className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pr-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button
                  onClick={() => setShowMentions(!showMentions)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <AtSign className="w-4 h-4" />
                </button>
              </div>
              <Button 
                size="icon"
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Mentions Dropdown */}
            {showMentions && projectMembers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {projectMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleMention(member.user_email)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#FFB800]/20 flex items-center justify-center text-[#FFB800] text-xs font-bold">
                      {member.user_name?.[0] || member.user_email?.[0]?.toUpperCase()}
                    </div>
                    <span>{member.user_name || member.user_email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button 
          variant="outline"
          onClick={handleDelete}
          className="w-full border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Task
        </Button>
      </div>
    </div>
  );
}