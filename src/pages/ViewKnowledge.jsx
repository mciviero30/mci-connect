import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ThumbsUp, Tag, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function ViewKnowledge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const { data: knowledge } = useQuery({
    queryKey: ['knowledge-detail', id],
    queryFn: () => base44.entities.FieldKnowledge.filter({ id }).then(r => r[0]),
    enabled: !!id,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const incrementViewMutation = useMutation({
    mutationFn: () => base44.entities.FieldKnowledge.update(id, {
      views_count: (knowledge?.views_count || 0) + 1
    }),
  });

  const markHelpfulMutation = useMutation({
    mutationFn: () => base44.entities.FieldKnowledge.update(id, {
      helpful_count: (knowledge?.helpful_count || 0) + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-detail', id] });
    },
  });

  useEffect(() => {
    if (knowledge && !sessionStorage.getItem(`viewed_${id}`)) {
      incrementViewMutation.mutate();
      sessionStorage.setItem(`viewed_${id}`, 'true');
    }
  }, [knowledge, id]);

  if (!knowledge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('FieldKnowledge'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Knowledge
        </Button>

        <Card className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <Badge className="soft-blue-gradient mb-3">{knowledge.category}</Badge>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{knowledge.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{knowledge.author_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(knowledge.created_date), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Photos */}
          {knowledge.photos?.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              {knowledge.photos.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-slate max-w-none mb-6">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {knowledge.content}
            </p>
          </div>

          {/* Tags */}
          {knowledge.tags?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-2">Tags:</p>
              <div className="flex flex-wrap gap-2">
                {knowledge.tags.map((tag, idx) => (
                  <Badge key={idx} className="soft-slate-gradient">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 border-t flex items-center justify-between">
            <Button
              onClick={() => markHelpfulMutation.mutate()}
              variant="outline"
              className="gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              Helpful ({knowledge.helpful_count || 0})
            </Button>
            <span className="text-sm text-slate-500">
              {knowledge.views_count || 0} views
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}