import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, Image, Smile, Search, Paperclip, X, UserPlus, Hash, AtSign, Menu, MoreVertical, Phone, Video } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UniversalMessageBubble from "../components/chat/UniversalMessageBubble";
import TypingIndicator from "../components/chat/TypingIndicator";
import MentionInput from "../components/chat/MentionInput";
import DirectMessagesList from "../components/chat/DirectMessagesList";
import CreateGroupDialog from "../components/chat/CreateGroupDialog";
import UserProfileModal from "../components/chat/UserProfileModal";
import ChatNotificationCenter from "../components/chat/ChatNotificationCenter";
import JobChatMembers from "../components/chat/JobChatMembers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import ChatUnreadBadge from "../components/chat/ChatUnreadBadge";
import OnlineStatusManager from "../components/chat/OnlineStatusManager";
import UserStatusIndicator from "@/components/chat/UserStatusIndicator";
import { sendNotification } from "../components/notifications/PushNotificationService";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞',
  '👍', '👎', '👊', '✊', '🤞', '✌️', '🤘', '👌', '💪', '🙏', '🔥', '💥', '⭐', '✨'
];

const EmojiPicker = ({ onSelect }) => (
  <div className="grid grid-cols-8 gap-1 p-3 max-h-64 overflow-y-auto">
    {EMOJIS.map((emoji, idx) => (
      <button
        key={idx}
        onClick={() => onSelect(emoji)}
        className="text-xl hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors active:scale-95"
      >
        {emoji}
      </button>
    ))}
  </div>
);

export default function Chat() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const toast = useToast();
  
  const [message, setMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [chatMode, setChatMode] = useState('channels');
  const [selectedDMConv, setSelectedDMConv] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedCustomGroup, setSelectedCustomGroup] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', selectedGroup, selectedDMConv?.id, selectedCustomGroup?.id],
    queryFn: () => {
      if (chatMode === 'direct' && selectedDMConv) {
        return base44.entities.ChatMessage.filter({ group_id: `dm_${selectedDMConv.id}` }, 'created_date');
      }
      if (chatMode === 'groups' && selectedCustomGroup) {
        return base44.entities.ChatMessage.filter({ group_id: `group_${selectedCustomGroup.id}` }, 'created_date');
      }
      return base44.entities.ChatMessage.filter({ group_id: selectedGroup }, 'created_date');
    },
    initialData: [],
    refetchInterval: 2000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['chatEmployees'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }, 'full_name', 200),
    initialData: [],
    staleTime: 300000,
  });

  const { data: customGroups = [] } = useQuery({
    queryKey: ['chatGroups'],
    queryFn: () => base44.entities.ChatGroup.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessage('');
      setReplyingTo(null);
      setEditingMessage(null);
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setEditingMessage(null);
      setMessage('');
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatMessage.update(id, { 
      message: '[Mensaje eliminado]',
      is_deleted: true 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, reaction }) => {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg?.reactions || {};
      const reactionUsers = reactions[reaction] || [];
      const newReactionUsers = reactionUsers.includes(user.email)
        ? reactionUsers.filter(email => email !== user.email)
        : [...reactionUsers, user.email];
      return base44.entities.ChatMessage.update(messageId, {
        reactions: { ...reactions, [reaction]: newReactionUsers }
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        const { id, ...updateData } = data;
        return base44.entities.ChatGroup.update(id, updateData);
      }
      return base44.entities.ChatGroup.create(data);
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
      setChatMode('groups');
      setSelectedCustomGroup(group);
      setShowCreateGroup(false);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => base44.entities.ChatGroup.update(groupId, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
      setSelectedCustomGroup(null);
      setChatMode('channels');
      setShowCreateGroup(false);
    },
  });

  const handleSend = (e, content = null, type = 'text', fileName = null) => {
    if (e) e.preventDefault();
    const messageContent = content || message.trim();
    if (!messageContent) return;

    let groupId = selectedGroup;
    if (chatMode === 'direct' && selectedDMConv) {
      groupId = `dm_${selectedDMConv.id}`;
    } else if (chatMode === 'groups' && selectedCustomGroup) {
      groupId = `group_${selectedCustomGroup.id}`;
    }

    if (editingMessage) {
      updateMessageMutation.mutate({ id: editingMessage.id, data: { message: messageContent } });
      return;
    }

    const messageData = {
      sender_user_id: user?.id,
      sender_email: user.email,
      sender_name: user.full_name,
      message: messageContent,
      message_type: type,
      group_id: groupId,
      file_name: fileName
    };

    if (replyingTo) {
      messageData.reply_to_message_id = replyingTo.id;
      messageData.reply_to_message = replyingTo.message.substring(0, 100);
      messageData.reply_to_sender_name = replyingTo.sender_name;
    }

    sendMutation.mutate(messageData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'image');
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploadingImage(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'file', file.name);
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploadingFile(false);
  };

  const startDirectMessage = (employee) => {
    setChatMode('direct');
    setSelectedCustomGroup(null);
    setSelectedDMConv({ 
      id: `${user.email}_${employee.email}`,
      other_user_name: employee.full_name,
      participants: [user.email, employee.email]
    });
    setShowNewDM(false);
    setShowSidebar(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const groups = [
    { id: 'general', name: 'General', icon: Hash },
    ...jobs.filter(j => j.status === 'active').map(job => ({
      id: job.id,
      name: job.name,
      icon: MessageSquare
    }))
  ];

  const currentChat = chatMode === 'direct' && selectedDMConv 
    ? { name: selectedDMConv.other_user_name, icon: AtSign }
    : chatMode === 'groups' && selectedCustomGroup 
    ? { name: selectedCustomGroup.group_name, icon: Users }
    : groups.find(g => g.id === selectedGroup) || { name: 'Chat', icon: MessageSquare };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <OnlineStatusManager userEmail={user?.email} />
      
      {/* Top Header - MCI Style */}
      <div className="flex-shrink-0 h-12 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] flex items-center px-2 gap-1.5 shadow-md z-10">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="md:hidden p-1 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
        >
          <Menu className="w-4 h-4 text-white" />
        </button>
        
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {currentChat.icon && <currentChat.icon className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-semibold text-white truncate">{currentChat.name}</h1>
            <p className="text-[8px] text-white/80 truncate">
              {chatMode === 'channels' && `${groups.length} canales`}
              {chatMode === 'groups' && 'Grupo privado'}
              {chatMode === 'direct' && 'En línea'}
            </p>
          </div>
        </div>

        <ChatNotificationCenter 
          userEmail={user?.email}
          onNavigate={(notification) => {
            if (notification.group_id?.startsWith('dm_')) {
              setChatMode('direct');
              setSelectedDMConv({ id: notification.group_id.replace('dm_', '') });
            } else if (notification.group_id?.startsWith('group_')) {
              const group = customGroups.find(g => g.id === notification.group_id.replace('group_', ''));
              if (group) {
                setChatMode('groups');
                setSelectedCustomGroup(group);
              }
            } else {
              setChatMode('channels');
              setSelectedGroup(notification.group_id);
            }
          }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar Backdrop */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/60 md:hidden z-40"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {/* Sidebar - MCI Style */}
        <div className={`
          fixed md:relative w-[280px] flex flex-col bg-white dark:bg-slate-800
          transition-transform duration-300 ease-out z-50 md:z-auto shadow-xl md:shadow-none
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:border-r md:border-slate-200 md:dark:border-slate-700
          md:h-full h-[calc(100vh-3.5rem-3.5rem)]
        `}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 h-11 px-2 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white">Mensajes</h2>
            <div className="flex gap-0.5">
              <button
                onClick={() => {
                  setShowCreateGroup(true);
                  setShowSidebar(false);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={() => {
                  setShowNewDM(true);
                  setShowSidebar(false);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Chat Mode Tabs */}
          <div className="flex-shrink-0 p-2 bg-slate-50 dark:bg-slate-900">
            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setChatMode('channels')}
                className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-semibold transition-all ${
                  chatMode === 'channels' 
                    ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="w-3 h-3 inline mr-1" />
                Canales
              </button>
              <button
                onClick={() => setChatMode('groups')}
                className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-semibold transition-all ${
                  chatMode === 'groups' 
                    ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                Grupos
              </button>
              <button
                onClick={() => setChatMode('direct')}
                className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-semibold transition-all ${
                  chatMode === 'direct' 
                    ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <AtSign className="w-3 h-3 inline mr-1" />
                DMs
              </button>
            </div>
          </div>

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto">
            {chatMode === 'channels' && groups.map(group => {
              const Icon = group.icon;
              const isActive = selectedGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedDMConv(null);
                    setSelectedCustomGroup(null);
                    setShowSidebar(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                    isActive ? 'bg-[#507DB4]/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isActive ? 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{group.name}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Canal de equipo</p>
                  </div>
                  <ChatUnreadBadge userId={user?.id} userEmail={user?.email} groupId={group.id} />
                </button>
              );
            })}

            {chatMode === 'groups' && customGroups.filter(g => g.is_active && g.members.includes(user?.email)).map(group => {
              const isActive = selectedCustomGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setChatMode('groups');
                    setSelectedCustomGroup(group);
                    setSelectedDMConv(null);
                    setShowSidebar(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                    isActive ? 'bg-[#507DB4]/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isActive ? 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{group.group_name}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{group.members?.length || 0} miembros</p>
                  </div>
                  <ChatUnreadBadge userId={user?.id} userEmail={user?.email} groupId={`group_${group.id}`} />
                </button>
              );
            })}

            {chatMode === 'direct' && (
              <DirectMessagesList
                conversations={[]}
                currentUserId={user?.email}
                onSelect={(conv) => {
                  setSelectedDMConv(conv);
                  setSelectedCustomGroup(null);
                  setShowSidebar(false);
                }}
                selectedId={selectedDMConv?.id}
              />
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-0 relative">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-32">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-3 border-[#507DB4]/30 border-t-[#507DB4] rounded-full animate-spin"></div>
              </div>
            )}
            
            {!isLoading && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">¡Inicia la conversación!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Envía un mensaje para empezar</p>
                </div>
              </div>
            )}
            
            {messages.map((msg) => {
              const isMe = msg.sender_user_id ? msg.sender_user_id === user?.id : msg.sender_email === user?.email;
              return (
                <UniversalMessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={isMe}
                  onReply={setReplyingTo}
                  onReaction={(msgId, reaction) => reactionMutation.mutate({ messageId: msgId, reaction })}
                  onEdit={setEditingMessage}
                  onDelete={(msgId) => deleteMessageMutation.mutate(msgId)}
                  userEmail={user?.email}
                  language={language}
                  isDark={false}
                />
              );
            })}
            <TypingIndicator users={typingUsers} />
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area Container - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            {/* Reply/Edit Banner */}
            {replyingTo && (
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400">Respondiendo a {replyingTo.sender_name}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{replyingTo.message}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
                  <X className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            )}

            {/* Input Area - MCI Style */}
            <form onSubmit={handleSend} className="px-3 py-2">
            <div className="flex gap-1.5 items-end">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
              <button
                type="button"
                onClick={() => document.getElementById('image-upload').click()}
                disabled={uploadingImage}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              >
                <Image className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              
              <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={uploadingFile}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              >
                <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>

              <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <MentionInput
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSend}
                  employees={employees}
                  placeholder="Escribe un mensaje"
                  className="bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-0 px-3 py-2"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0">
                    <Smile className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <EmojiPicker onSelect={(emoji) => setMessage(message + emoji)} />
                </PopoverContent>
              </Popover>
              
              <button 
                type="submit" 
                disabled={!message.trim() || sendMutation.isPending}
                className="p-2 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Nuevo Mensaje</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {employees.filter(emp => emp.email !== user?.email && emp.status === 'active').map(emp => {
              const displayName = emp.full_name || emp.email.split('@')[0];
              return (
                <button
                  key={emp.email}
                  onClick={() => startDirectMessage(emp)}
                  className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors border border-transparent hover:border-[#507DB4]/30"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-base">{displayName[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position || 'Empleado'}</p>
                  </div>
                  <UserStatusIndicator status={emp.is_online ? 'online' : 'offline'} size="sm" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        employees={employees}
        currentUser={user}
        onCreateGroup={(data) => createGroupMutation.mutate(data)}
        onDeleteGroup={(id) => deleteGroupMutation.mutate(id)}
        editingGroup={selectedCustomGroup}
      />

      <UserProfileModal
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
        userEmail={selectedProfileEmail}
        currentUserEmail={user?.email}
        isCurrentUser={selectedProfileEmail === user?.email}
      />
    </div>
  );
}