import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Hash, Plus, Users, Paperclip, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

const defaultChannels = [
  { id: 'general', name: 'General', icon: Hash },
  { id: 'tasks', name: 'Tasks', icon: Hash },
  { id: 'urgent', name: 'Urgent', icon: Hash },
];

export default function FieldChatView({ jobId }) {
  const [activeChannel, setActiveChannel] = useState('general');
  const [message, setMessage] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const messagesEndRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['field-chat', jobId, activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      job_id: jobId, 
      channel: activeChannel 
    }, 'created_date'),
    refetchInterval: 5000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-chat', jobId, activeChannel] });
      setMessage('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({
      job_id: jobId,
      channel: activeChannel,
      content: message,
      sender_name: user?.full_name || 'Usuario',
      sender_email: user?.email,
    });
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = format(new Date(msg.created_date), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex h-full">
      {/* Channels Sidebar */}
      <div className="w-56 bg-[#2a2a2a] border-r border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Channels</h3>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowNewChannel(true)}
            className="text-slate-400 hover:text-white h-7 w-7"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {defaultChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeChannel === channel.id
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <channel.icon className="w-4 h-4" />
              {channel.name}
            </button>
          ))}
        </div>

        {/* Online Members */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team ({members.length})
          </h3>
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-400 truncate">
                  {member.user_name || member.user_email}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-[#FFB800]" />
            <h2 className="font-semibold text-white capitalize">{activeChannel}</h2>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">
                  {format(new Date(date), 'EEEE, dd MMM yyyy')}
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <div className="space-y-4">
                {msgs.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {msg.sender_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-white">{msg.sender_name}</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(msg.created_date), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{msg.content}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {msg.attachments.map((att, idx) => (
                            <a 
                              key={idx}
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 text-sm hover:underline"
                            >
                              View attachment
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Image className="w-5 h-5" />
            </Button>
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Message in #${activeChannel}...`}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}