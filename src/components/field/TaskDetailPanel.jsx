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
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function TaskDetailPanel({ task, onClose, jobId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');
  
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

  const deleteTaskMutation = useMutation({
    mutationFn: () => base44.entities.Task.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      onClose();
    },
  });

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
    <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Detalle de Tarea</h3>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-400 hover:text-green-300">
              <Save className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-white">
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
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
            className="bg-slate-900 border-slate-700 text-white"
          />
        ) : (
          <h4 className="text-lg font-semibold text-white">{task.title}</h4>
        )}

        {/* Status */}
        <div>
          <label className="text-xs text-slate-400 uppercase mb-1 block">Estado</label>
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="pending" className="text-white">Pendiente</SelectItem>
              <SelectItem value="in_progress" className="text-white">En Progreso</SelectItem>
              <SelectItem value="completed" className="text-white">Completada</SelectItem>
              <SelectItem value="blocked" className="text-white">Bloqueada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-slate-400 uppercase mb-1 block">Prioridad</label>
          {isEditing ? (
            <Select value={editedTask.priority} onValueChange={(v) => setEditedTask({...editedTask, priority: v})}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="low" className="text-white">Baja</SelectItem>
                <SelectItem value="medium" className="text-white">Media</SelectItem>
                <SelectItem value="high" className="text-white">Alta</SelectItem>
                <SelectItem value="urgent" className="text-white">Urgente</SelectItem>
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
          <label className="text-xs text-slate-400 uppercase mb-1 block">Descripción</label>
          {isEditing ? (
            <Textarea 
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
              rows={3}
            />
          ) : (
            <p className="text-slate-300 text-sm">{task.description || 'Sin descripción'}</p>
          )}
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300">{format(new Date(task.due_date), 'dd MMM yyyy')}</span>
          </div>
        )}

        {/* Assigned To */}
        {task.assigned_to && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300">{task.assigned_to}</span>
          </div>
        )}

        {/* Checklist */}
        {task.checklist?.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 uppercase mb-2 block">Checklist</label>
            <div className="space-y-2">
              {task.checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={item.completed}
                    onChange={() => {
                      const newChecklist = [...task.checklist];
                      newChecklist[idx].completed = !newChecklist[idx].completed;
                      updateTaskMutation.mutate({ checklist: newChecklist });
                    }}
                    className="rounded border-slate-600"
                  />
                  <span className={`text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 uppercase mb-2 block">Archivos</label>
            <div className="space-y-2">
              {attachments.map((att) => (
                <a 
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 truncate">{att.file_name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="text-xs text-slate-400 uppercase mb-2 block">
            Comentarios ({comments.length})
          </label>
          <div className="space-y-3 mb-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-slate-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-amber-400">{comment.author_name}</span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(comment.created_date), 'dd MMM HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{comment.comment}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="bg-slate-900 border-slate-700 text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <Button 
              size="icon"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <Button 
          variant="outline"
          onClick={() => deleteTaskMutation.mutate()}
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar Tarea
        </Button>
      </div>
    </div>
  );
}