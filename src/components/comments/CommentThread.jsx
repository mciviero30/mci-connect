import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Reply, Edit, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const MentionInput = ({ value, onChange, onSubmit, placeholder, employees }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Detect @ mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex === cursorPos - 1) {
      setShowSuggestions(true);
      setMentionSearch('');
    } else if (atIndex !== -1 && textBeforeCursor.substring(atIndex).indexOf(' ') === -1) {
      setShowSuggestions(true);
      setMentionSearch(textBeforeCursor.substring(atIndex + 1));
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (employee) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    const newValue = 
      textBeforeCursor.substring(0, atIndex) + 
      `@${employee.full_name} ` + 
      textAfterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="bg-white dark:bg-[#282828] min-h-[80px]"
      />
      {showSuggestions && filteredEmployees.length > 0 && (
        <Card className="absolute bottom-full mb-2 w-full z-50 bg-white dark:bg-[#282828] shadow-lg">
          <CardContent className="p-2">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => insertMention(emp)}
                className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {emp.full_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{emp.full_name}</p>
                  <p className="text-xs text-slate-500">{emp.email}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Comment = ({ comment, onReply, onEdit, onDelete, currentUser, employees }) => {
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);

  const isAuthor = currentUser?.email === comment.author_email;

  const handleSaveEdit = () => {
    onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  // Highlight mentions
  const renderContent = (text) => {
    const parts = text.split(/(@\w+(?:\s+\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.author_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">{comment.author_name}</span>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(comment.created_date), { 
                addSuffix: true,
                locale: language === 'es' ? es : undefined
              })}
            </span>
            {comment.is_edited && (
              <Badge variant="outline" className="text-xs">edited</Badge>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="bg-white dark:bg-[#282828] text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {renderContent(comment.content)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReply(!showReply)}
              className="h-7 text-xs"
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
            {isAuthor && !isEditing && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(comment.id)}
                  className="h-7 text-xs text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>

          {showReply && (
            <div className="mt-2">
              <CommentInput
                entityType={comment.entity_type}
                entityId={comment.entity_id}
                parentCommentId={comment.id}
                onSubmit={() => setShowReply(false)}
                placeholder="Write a reply..."
                employees={employees}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentInput = ({ entityType, entityId, parentCommentId, onSubmit, placeholder, employees }) => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      // Extract mentions
      const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(data.content)) !== null) {
        const mentionedEmployee = employees.find(e => 
          e.full_name.toLowerCase() === match[1].toLowerCase()
        );
        if (mentionedEmployee) {
          mentions.push(mentionedEmployee.email);
        }
      }

      const comment = await base44.entities.Comment.create({
        ...data,
        mentions
      });

      // Create notifications for mentions
      for (const email of mentions) {
        if (email !== user.email) {
          await base44.entities.Notification.create({
            user_email: email,
            type: 'mention',
            title: `${user.full_name} mentioned you`,
            message: `in a comment: "${data.content.substring(0, 50)}..."`,
            link: null,
            is_read: false
          });
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments']);
      queryClient.invalidateQueries(['notifications']);
      setContent('');
      onSubmit?.();
      toast.success('Comment posted');
    }
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createCommentMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      author_email: user.email,
      author_name: user.full_name,
      content: content.trim(),
      parent_comment_id: parentCommentId || null
    });
  };

  return (
    <div className="space-y-2">
      <MentionInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        employees={employees}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || createCommentMutation.isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {createCommentMutation.isPending ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  );
};

export default function CommentThread({ entityType, entityId }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 1800000,
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ 
      entity_type: entityType, 
      entity_id: entityId 
    }, '-created_date'),
    staleTime: 60000,
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }) => base44.entities.Comment.update(id, {
      content,
      is_edited: true,
      edited_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments']);
      toast.success('Comment updated');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments']);
      toast.success('Comment deleted');
    }
  });

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parent_comment_id) {
      if (!acc[comment.parent_comment_id]) acc[comment.parent_comment_id] = [];
      acc[comment.parent_comment_id].push(comment);
    }
    return acc;
  }, {});

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">
            {language === 'es' ? 'Comentarios y Discusión' : 'Comments & Discussion'}
          </h3>
          <Badge variant="outline">{comments.length}</Badge>
        </div>

        <CommentInput
          entityType={entityType}
          entityId={entityId}
          placeholder={language === 'es' ? 'Escribe un comentario... (usa @ para mencionar)' : 'Write a comment... (use @ to mention)'}
          employees={employees}
        />

        {isLoading ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'es' ? 'No hay comentarios aún' : 'No comments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {topLevelComments.map(comment => (
              <div key={comment.id}>
                <Comment
                  comment={comment}
                  onEdit={(id, content) => updateCommentMutation.mutate({ id, content })}
                  onDelete={(id) => deleteCommentMutation.mutate(id)}
                  currentUser={user}
                  employees={employees}
                />
                {repliesByParent[comment.id] && (
                  <div className="ml-8 mt-2 space-y-2">
                    {repliesByParent[comment.id].map(reply => (
                      <Comment
                        key={reply.id}
                        comment={reply}
                        onEdit={(id, content) => updateCommentMutation.mutate({ id, content })}
                        onDelete={(id) => deleteCommentMutation.mutate(id)}
                        currentUser={user}
                        employees={employees}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}