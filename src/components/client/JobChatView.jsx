import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function JobChatView({ jobId, currentUser }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch messages for this job
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['job-chat', jobId],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      project_id: jobId,
      channel: 'general'
    }, 'created_date'),
    enabled: !!jobId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const createMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-chat', jobId] });
      setNewMessage('');
      scrollToBottom();
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    createMessageMutation.mutate({
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      content: newMessage.trim(),
      project_id: jobId,
      channel: 'general',
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      createMessageMutation.mutate({
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: '📷 Image',
        project_id: jobId,
        channel: 'general',
        attachments: [{ url: file_url, type: 'image', name: file.name }],
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Check if user is client
  const isClient = currentUser?.role !== 'admin' && !currentUser?.position;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_email === currentUser?.email;
            const isClientMessage = !msg.sender_email?.includes('@') || msg.sender_email?.includes('client');
            
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    isClientMessage ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {msg.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isOwn && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {msg.sender_name}
                      </span>
                    )}
                    {isClientMessage && !isOwn && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-1.5 py-0">
                        Client
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </span>
                  </div>
                  
                  <div className={`rounded-lg px-4 py-2 ${
                    isOwn 
                      ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, idx) => (
                          att.type === 'image' ? (
                            <img
                              key={idx}
                              src={att.url}
                              alt={att.name}
                              className="max-w-full rounded border"
                            />
                          ) : (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              {att.name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="chat-image-upload"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('chat-image-upload')?.click()}
            disabled={uploading}
            className="flex-shrink-0"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || createMessageMutation.isPending}
            className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}