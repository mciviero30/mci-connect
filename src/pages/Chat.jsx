import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, Image, Smile, Search, Paperclip, X, UserPlus, Hash, AtSign, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MessageBubble from "../components/chat/MessageBubble";
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
import { Badge } from "@/components/ui/badge";
import ChatUnreadBadge from "../components/chat/ChatUnreadBadge";
import OnlineStatusManager from "../components/chat/OnlineStatusManager";
import UserStatusIndicator from "@/components/chat/UserStatusIndicator";
import { sendNotification } from "../components/notifications/PushNotificationService";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
  '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏',
  '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾',
  '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👯', '🧘', '🛀', '🛌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
  '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
  '🔥', '💥', '⭐', '🌟', '✨', '⚡', '💫', '☄️', '☀️', '🌤️', '⛅', '🌥️',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎'
];

const EmojiPicker = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-8 gap-2 p-4 max-h-64 overflow-y-auto">
      {EMOJIS.map((emoji, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(emoji)}
          className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors"
          >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const GifSearch = ({ onSelect }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchGifs = async (query) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setGifs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchGifs(search);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search GIFs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {loading && (
          <div className="col-span-2 text-center py-8 text-slate-500 dark:text-slate-400">Loading...</div>
        )}
        {!loading && gifs.length === 0 && search && (
          <div className="col-span-2 text-center py-8 text-slate-500 dark:text-slate-400">No GIFs found</div>
        )}
        {!loading && gifs.length === 0 && !search && (
          <div className="col-span-2 text-center py-8 text-slate-500 dark:text-slate-400">Type to search GIFs</div>
        )}
        {gifs.map((gif) => (
          <button
            key={gif.id}
            onClick={() => onSelect(gif.media_formats.tinygif.url)}
            className="rounded overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img src={gif.media_formats.tinygif.url} alt="" className="w-full h-32 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default function Chat() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const typingTimeoutRef = useRef(null);
  
  const [message, setMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [selectedDMUser, setSelectedDMUser] = useState(null);
  const [chatMode, setChatMode] = useState('channels'); // 'channels', 'direct', or 'groups'
  const [selectedDMConv, setSelectedDMConv] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedCustomGroup, setSelectedCustomGroup] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState(null);
  const [showJobMembers, setShowJobMembers] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', selectedGroup, selectedDMConv?.id, selectedCustomGroup?.id],
    queryFn: () => {
      if (chatMode === 'direct' && selectedDMConv) {
        return base44.entities.ChatMessage.filter({ 
          group_id: `dm_${selectedDMConv.id}` 
        }, 'created_date');
      }
      if (chatMode === 'groups' && selectedCustomGroup) {
        return base44.entities.ChatMessage.filter({ 
          group_id: `group_${selectedCustomGroup.id}` 
        }, 'created_date');
      }
      return base44.entities.ChatMessage.filter({ group_id: selectedGroup }, 'created_date');
    },
    initialData: [],
    refetchInterval: 2000,
    staleTime: 1000,
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

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setEditingMessage(null);
      setMessage('');
      toast.success(language === 'es' ? 'Mensaje actualizado' : 'Message updated');
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatMessage.update(id, { 
      message: language === 'es' ? '[Mensaje eliminado]' : '[Message deleted]',
      is_deleted: true 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success(language === 'es' ? 'Mensaje eliminado' : 'Message deleted');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: async (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
      setMessage('');
      setReplyingTo(null);
      setEditingMessage(null);
      
      // Get all members of current conversation
      let recipientEmails = [];
      if (chatMode === 'direct' && selectedDMConv) {
        recipientEmails = selectedDMConv.participants.filter(email => email !== user.email);
      } else if (chatMode === 'groups' && selectedCustomGroup) {
        recipientEmails = selectedCustomGroup.members.filter(email => email !== user.email);
      } else {
        // For channels, get all employees (they can all see it)
        recipientEmails = employees.map(e => e.email).filter(email => email !== user.email);
      }

      // Send push notifications to recipients
      const groupName = chatMode === 'direct' && selectedDMConv 
        ? selectedDMConv.other_user_name
        : chatMode === 'groups' && selectedCustomGroup 
        ? selectedCustomGroup.group_name 
        : groups.find(g => g.id === selectedGroup)?.name || 'Chat';

      recipientEmails.forEach(recipientEmail => {
        sendNotification({
          userEmail: recipientEmail,
          type: 'chat_message',
          title: `💬 ${user.full_name} in ${groupName}`,
          body: message.substring(0, 100),
          url: '/Chat',
          priority: 'normal'
        }).catch(err => console.error('Error sending notification:', err));
      });
      
      // Send chat notifications to mentioned users
      const mentions = extractMentions(message);
      if (mentions.length > 0) {
        mentions.forEach(mentionedName => {
          const mentionedUser = employees.find(e => e.full_name === mentionedName);
          if (mentionedUser && mentionedUser.email !== user.email) {
            base44.entities.ChatNotification.create({
              recipient_email: mentionedUser.email,
              type: 'mention',
              title: `${user.full_name} mentioned you`,
              message: message.substring(0, 100),
              sender_email: user.email,
              sender_name: user.full_name,
              group_id: chatMode === 'direct' && selectedDMConv 
                ? `dm_${selectedDMConv.id}` 
                : chatMode === 'groups' && selectedCustomGroup 
                ? `group_${selectedCustomGroup.id}` 
                : selectedGroup,
              is_read: false,
              is_dismissed: false
            }).catch(err => console.error('Error creating mention notification:', err));
          }
        });
      }
    }
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
        reactions: {
          ...reactions,
          [reaction]: newReactionUsers
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
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
      toast.success(group.id ? 'Group updated successfully!' : 'Group created successfully!');
    },
    onError: () => {
      toast.error('Failed to save group');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => base44.entities.ChatGroup.update(groupId, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
      setSelectedCustomGroup(null);
      setChatMode('channels');
      setShowCreateGroup(false);
      toast.success('Group deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete group');
    }
  });

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const matches = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  const handleSend = (e, content = null, type = 'text', fileName = null, fileSize = null) => {
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
      updateMessageMutation.mutate({ 
        id: editingMessage.id, 
        data: { message: messageContent } 
      });
      return;
    }

    const messageData = {
      sender_user_id: user?.id,        // SSOT: Write user_id
      sender_email: user.email,
      sender_name: user.full_name,
      message: messageContent,
      message_type: type,
      group_id: groupId,
      file_name: fileName,
      file_size: fileSize
    };

    if (replyingTo) {
      messageData.reply_to_message_id = replyingTo.id;
      messageData.reply_to_message = replyingTo.message.substring(0, 100);
      messageData.reply_to_sender_name = replyingTo.sender_name;
    }

    sendMutation.mutate(messageData);
  };

  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setMessage(msg.message);
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm(language === 'es' ? '¿Eliminar mensaje?' : 'Delete message?')) {
      deleteMessageMutation.mutate(msgId);
    }
  };

  const handleExportChat = () => {
    const chatData = filteredMessages.map(msg => ({
      date: format(new Date(msg.created_date), 'yyyy-MM-dd HH:mm:ss'),
      sender: msg.sender_name,
      message: msg.message,
      type: msg.message_type
    }));

    const csv = [
      ['Date', 'Sender', 'Message', 'Type'].join(','),
      ...chatData.map(row => 
        [row.date, row.sender, `"${row.message}"`, row.type].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'image');
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setUploadingImage(false);
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(message + emoji);
  };

  const handleGifSelect = (gifUrl) => {
    handleSend(null, gifUrl, 'gif');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'file', file.name, file.size);
      toast.success('File sent successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
    setUploadingFile(false);
  };

  const handleReaction = (messageId, reaction) => {
    reactionMutation.mutate({ messageId, reaction });
  };

  const handleTyping = (text) => {
    setMessage(text);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout - could send typing indicator to backend here
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stopped
    }, 1000);
  };

  const startDirectMessage = (employee) => {
    setSelectedDMUser(employee);
    setChatMode('direct');
    setSelectedCustomGroup(null);
    setSelectedDMConv({ 
      id: `${user.email}_${employee.email}`,
      other_user_name: employee.full_name,
      participants: [user.email, employee.email]
    });
    setShowNewDM(false);
  };

  const handleCreateGroup = (groupData) => {
    createGroupMutation.mutate(groupData);
  };

  const handleDeleteGroup = (groupId) => {
    deleteGroupMutation.mutate(groupId);
  };

  const selectCustomGroup = (group) => {
    setChatMode('groups');
    setSelectedCustomGroup(group);
    setSelectedDMConv(null);
  };

  const openUserProfile = (email) => {
    setSelectedProfileEmail(email);
    setShowUserProfile(true);
  };

  // Check if user can manage groups
  const canManageGroups = user?.role === 'admin' || 
                          user?.position === 'CEO' || 
                          user?.department === 'HR' || 
                          user?.position === 'manager';

  const handleDeleteSelectedGroup = () => {
    if (selectedCustomGroup) {
      if (confirm('¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.')) {
        deleteGroupMutation.mutate(selectedCustomGroup.id);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Mark messages as read when viewing
    // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
    if (messages && messages.length > 0 && user) {
      const unreadMessages = messages.filter(msg => {
        // Don't mark own messages as read
        const isOwnMessage = msg.sender_user_id ? msg.sender_user_id === user.id : msg.sender_email === user.email;
        if (isOwnMessage) return false;
        
        // Check if already read by user (by user_id or email)
        const readBy = msg.read_by || [];
        return !readBy.includes(user.id) && !readBy.includes(user.email);
      });
      
      unreadMessages.forEach(msg => {
        const readBy = msg.read_by || [];
        // Store user_id if available, otherwise email
        const identifier = user.id || user.email;
        if (!readBy.includes(identifier)) {
          base44.entities.ChatMessage.update(msg.id, {
            read_by: [...readBy, identifier]
          }).catch(err => console.error('Error marking message as read:', err));
        }
      });
    }
  }, [messages, user]);

  // Filter messages by search
  const filteredMessages = searchTerm 
    ? messages.filter(m => 
        m.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const AVATAR_COLORS = [
    { value: 'blue', class: 'from-blue-500 to-blue-600' },
    { value: 'purple', class: 'from-purple-500 to-purple-600' },
    { value: 'green', class: 'from-green-500 to-green-600' },
    { value: 'orange', class: 'from-orange-500 to-orange-600' },
    { value: 'pink', class: 'from-pink-500 to-pink-600' },
    { value: 'teal', class: 'from-teal-500 to-teal-600' }
  ];

  const groups = [
    { id: 'general', name: t('general'), icon: Users },
    ...jobs.filter(j => j.status === 'active').map(job => ({
      id: job.id,
      name: job.name,
      icon: MessageSquare
    }))
  ];

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#0a0a0a] overflow-hidden">
     <OnlineStatusManager userEmail={user?.email} />
     
     {/* Mobile Header */}
     <div className="md:hidden flex-shrink-0 px-2 py-2 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <button 
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <MessageSquare className="w-4 h-4 text-[#507DB4]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
            {chatMode === 'direct' && selectedDMConv ? selectedDMConv.other_user_name : chatMode === 'groups' && selectedCustomGroup ? selectedCustomGroup.group_name : groups.find(g => g.id === selectedGroup)?.name || t('chat')}
          </h1>
        </div>
        <ChatNotificationCenter 
              userEmail={user?.email}
              onNavigate={(notification) => {
                if (notification.group_id) {
                  if (notification.group_id.startsWith('dm_')) {
                    setChatMode('direct');
                    setSelectedDMConv({ id: notification.group_id.replace('dm_', '') });
                  } else if (notification.group_id.startsWith('group_')) {
                    const group = customGroups.find(g => g.id === notification.group_id.replace('group_', ''));
                    if (group) selectCustomGroup(group);
                  } else {
                    setChatMode('channels');
                    setSelectedGroup(notification.group_id);
                  }
                }
            }}
        />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/40 md:hidden z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`absolute md:relative w-full md:w-72 h-full flex flex-col bg-white dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-700 transition-transform ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} z-50 md:z-auto`}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 px-2 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-900 dark:text-white">Chats</h2>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setShowCreateGroup(true);
                  setShowMobileSidebar(false);
                }}
                className="h-6 w-6 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Users className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setShowNewDM(true);
                  setShowMobileSidebar(false);
                }}
                className="h-6 w-6 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <UserPlus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex-shrink-0 px-2 py-1.5">
            <Tabs value={chatMode} onValueChange={setChatMode} className="w-full">
              <TabsList className="w-full h-7 bg-slate-100 dark:bg-slate-900 grid grid-cols-3 p-0.5 rounded-lg">
                <TabsTrigger value="channels" className="text-[9px] font-semibold rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#507DB4]">
                  <Hash className="w-3 h-3 mr-1" />
                  Canales
                </TabsTrigger>
                <TabsTrigger value="groups" className="text-[9px] font-semibold rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#507DB4]">
                  <Users className="w-3 h-3 mr-1" />
                  Grupos
                </TabsTrigger>
                <TabsTrigger value="direct" className="text-[9px] font-semibold rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#507DB4]">
                  <AtSign className="w-3 h-3 mr-1" />
                  DMs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="channels" className="mt-0 space-y-0">
                {groups.map(group => {
                  const Icon = group.icon;
                  const isActive = chatMode === 'channels' && selectedGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group.id);
                        setSelectedDMConv(null);
                        setSelectedCustomGroup(null);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full px-2 py-1.5 text-left flex items-center gap-2 transition-colors ${
                        isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        isActive ? 'bg-[#507DB4] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-semibold truncate ${isActive ? 'text-[#507DB4] dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {group.name}
                        </p>
                      </div>
                      <ChatUnreadBadge userId={user?.id} userEmail={user?.email} groupId={group.id} />
                    </button>
                  );
                })}
              </TabsContent>

              <TabsContent value="groups" className="mt-0 space-y-0">
                {customGroups.filter(g => g.is_active && g.members.includes(user?.email)).map(group => {
                  const isActive = chatMode === 'groups' && selectedCustomGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        selectCustomGroup(group);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full px-2 py-1.5 text-left flex items-center gap-2 transition-colors ${
                        isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        isActive ? 'bg-[#507DB4] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-semibold truncate ${isActive ? 'text-[#507DB4] dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {group.group_name}
                        </p>
                      </div>
                      <ChatUnreadBadge userId={user?.id} userEmail={user?.email} groupId={`group_${group.id}`} />
                    </button>
                  );
                })}
                {customGroups.filter(g => g.is_active && g.members.includes(user?.email)).length === 0 && (
                  <div className="text-center py-6 px-2">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-2">Sin grupos</p>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateGroup(true)}
                      className="h-6 px-2 text-[9px] bg-[#507DB4]"
                    >
                      Crear Grupo
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="direct" className="mt-0">
                <DirectMessagesList
                  conversations={[]}
                  currentUserId={user?.email}
                  onSelect={(conv) => {
                    setSelectedDMConv(conv);
                    setSelectedCustomGroup(null);
                    setShowMobileSidebar(false);
                  }}
                  selectedId={selectedDMConv?.id}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* CRITICAL: Close sidebar wrapper */}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0a0a0a]">

          {/* Reply/Edit Indicator */}
          {replyingTo && (
            <div className="flex-shrink-0 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400">Respondiendo a {replyingTo.sender_name}</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{replyingTo.message}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setReplyingTo(null)} className="h-5 w-5">
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          {editingMessage && (
            <div className="flex-shrink-0 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center justify-between">
              <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">Editando mensaje</p>
              <Button size="icon" variant="ghost" onClick={() => { setEditingMessage(null); setMessage(''); }} className="h-5 w-5">
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-[#507DB4]/30 border-t-[#507DB4] rounded-full animate-spin"></div>
              </div>
            )}
            {!isLoading && filteredMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">¡Inicia la conversación!</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">No hay mensajes aún. Sé el primero en escribir.</p>
                </div>
              </div>
            )}
            
            {filteredMessages.map((msg) => {
              const isMe = msg.sender_user_id ? msg.sender_user_id === user?.id : msg.sender_email === user?.email;
              return (
                <UniversalMessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={isMe}
                  onReply={setReplyingTo}
                  onReaction={handleReaction}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  userEmail={user?.email}
                  language={language}
                  isDark={false}
                />
              );
            })}
            <TypingIndicator users={typingUsers} />
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="flex-shrink-0 px-2 py-1.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a]">
            <div className="flex gap-1 items-end">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => document.getElementById('image-upload').click()}
                disabled={uploadingImage}
                className="h-7 w-7 text-slate-500 dark:text-slate-400"
              >
                <Image className="w-3.5 h-3.5" />
              </Button>
              
              <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={uploadingFile}
                className="h-7 w-7 text-slate-500 dark:text-slate-400"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>

              <MentionInput
                value={message}
                onChange={handleTyping}
                onSubmit={handleSend}
                employees={employees}
                placeholder={editingMessage ? 'Editar...' : replyingTo ? 'Responder...' : 'Mensaje...'}
                className="h-7 text-[10px] bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-full"
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-slate-500">
                    <Smile className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Tabs defaultValue="emojis">
                    <TabsList className="w-full bg-slate-100 dark:bg-slate-800">
                      <TabsTrigger value="emojis" className="flex-1 text-[9px]">Emojis</TabsTrigger>
                      <TabsTrigger value="gifs" className="flex-1 text-[9px]">GIFs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emojis" className="m-0">
                      <EmojiPicker onSelect={handleEmojiSelect} />
                    </TabsContent>
                    <TabsContent value="gifs" className="m-0">
                      <GifSearch onSelect={handleGifSelect} />
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>
              
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMutation.isPending} 
                className="h-7 w-7 p-0 bg-[#507DB4] hover:bg-[#507DB4]/90"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* New Direct Message Dialog */}
      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Start Direct Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto p-2">
              {employees && employees.length > 0 ? (
                employees
                  .filter(emp => emp.email !== user?.email && emp.status === 'active')
                  .map(emp => {
                    const displayName = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email.split('@')[0];
                    const displayPosition = emp.position || emp.email;
                    
                    return (
                      <button
                        key={emp.email}
                        onClick={() => startDirectMessage({
                          ...emp,
                          full_name: displayName
                        })}
                        className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors text-left border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-white font-bold">
                              {displayName[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <UserStatusIndicator 
                              status={emp.is_online ? 'online' : 'offline'} 
                              size="sm"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayPosition}</p>
                        </div>
                      </button>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No employees available</p>
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          employees={employees}
          currentUser={user}
          onCreateGroup={handleCreateGroup}
          onDeleteGroup={handleDeleteGroup}
          editingGroup={selectedCustomGroup}
      />

      {/* User Profile Modal */}
      <UserProfileModal
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
          userEmail={selectedProfileEmail}
          currentUserEmail={user?.email}
          isCurrentUser={selectedProfileEmail === user?.email}
      />

      {/* Job Chat Members Dialog */}
      <JobChatMembers
          jobId={selectedGroup}
          jobName={groups.find(g => g.id === selectedGroup)?.name || ''}
          isOpen={showJobMembers}
          onClose={() => setShowJobMembers(false)}
          language={t('language') === 'es' ? 'es' : 'en'}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-md bg-white dark:bg-[#282828]">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Exportar Conversación' : 'Export Conversation'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {language === 'es' 
                  ? `Se exportarán ${filteredMessages.length} mensajes en formato CSV`
                  : `${filteredMessages.length} messages will be exported as CSV`}
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button onClick={handleExportChat} className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Exportar' : 'Export'}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}