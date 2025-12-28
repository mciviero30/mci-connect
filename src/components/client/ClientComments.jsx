import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/toast';

export default function ClientComments({ jobId }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['job-comments', jobId],
    queryFn: () => base44.entities.Comment.filter({ 
      entity_type: 'job',
      entity_id: jobId 
    }, '-created_date'),
    enabled: !!jobId,
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.Comment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-comments', jobId]);
      setNewComment('');
      toast.success('Comentario añadido');
    },
    onError: () => {
      toast.error('Error al añadir comentario');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      entity_type: 'job',
      entity_id: jobId,
      author_email: user.email,
      author_name: user.full_name,
      content: newComment.trim()
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-xl">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg">Comentarios y Preguntas</h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe tu pregunta o comentario aquí..."
          className="mb-3 min-h-[100px] bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {createCommentMutation.isPending ? 'Enviando...' : 'Enviar Comentario'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay comentarios aún</p>
            <p className="text-sm text-slate-400 mt-1">Sé el primero en comentar</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">{comment.author_name}</p>
                    <span className="text-xs text-slate-500">
                      {format(new Date(comment.created_date), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}