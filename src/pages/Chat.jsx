import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, Image, Smile, Search, Paperclip, X, UserPlus, Hash, AtSign } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MessageBubble from "../components/chat/MessageBubble";
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
  const { t } = useLanguage();
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

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

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
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
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
    mutationFn: (data) => base44.entities.ChatGroup.create(data),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
      setChatMode('groups');
      setSelectedCustomGroup(newGroup);
      setShowCreateGroup(false);
      toast.success('Group created successfully!');
    },
    onError: () => {
      toast.error('Failed to create group');
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

    const messageData = {
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

  const selectCustomGroup = (group) => {
    setChatMode('groups');
    setSelectedCustomGroup(group);
    setSelectedDMConv(null);
  };

  const openUserProfile = (email) => {
    setSelectedProfileEmail(email);
    setShowUserProfile(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages by search
  const filteredMessages = searchTerm 
    ? messages.filter(m => 
        m.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const groups = [
    { id: 'general', name: t('general'), icon: Users },
    ...jobs.filter(j => j.status === 'active').map(job => ({
      id: job.id,
      name: job.name,
      icon: MessageSquare
    }))
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('chat')}
          description={t('realTimeCommunication')}
          icon={MessageSquare}
          actions={
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
          }
        />

        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Conversations</CardTitle>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowCreateGroup(true)}
                    className="h-7 w-7 text-[#3B9FF3] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Create group chat"
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowNewDM(true)}
                    className="h-7 w-7 text-[#3B9FF3] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Start direct message"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <Tabs value={chatMode} onValueChange={setChatMode} className="w-full">
                <TabsList className="w-full h-9 bg-slate-100 dark:bg-slate-800 mb-4 grid grid-cols-3 p-1 rounded-lg">
                  <TabsTrigger value="channels" className="text-xs rounded-md data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-300">
                    <Hash className="w-3.5 h-3.5 mr-1" />
                    Channels
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="text-xs rounded-md data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Groups
                  </TabsTrigger>
                  <TabsTrigger value="direct" className="text-xs rounded-md data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-300">
                    <AtSign className="w-3.5 h-3.5 mr-1" />
                    DMs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="channels" className="mt-0">
                  <div className="space-y-1">
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
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-md'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#3B9FF3] dark:text-blue-400'}`} />
                          </div>
                          <span className="font-medium text-sm truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="mt-0">
                  <div className="space-y-1">
                    {customGroups
                      .filter(g => g.is_active && g.members.includes(user?.email))
                      .map(group => {
                        const colorClass = AVATAR_COLORS.find(c => c.value === group.avatar_color)?.class || 'from-blue-500 to-blue-600';
                        const isActive = chatMode === 'groups' && selectedCustomGroup?.id === group.id;
                        return (
                          <button
                            key={group.id}
                            onClick={() => selectCustomGroup(group)}
                            className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-md'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{group.group_name}</p>
                              <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                {group.members.length} members
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    {customGroups.filter(g => g.is_active && g.members.includes(user?.email)).length === 0 && (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm mb-2">No groups yet</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCreateGroup(true)}
                          className="h-8 text-xs"
                        >
                          Create Group
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="direct" className="mt-0">
                  <DirectMessagesList
                    conversations={[]}
                    currentUserId={user?.email}
                    onSelect={(conv) => {
                      setSelectedDMConv(conv);
                      setSelectedCustomGroup(null);
                    }}
                    selectedId={selectedDMConv?.id}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <MessageSquare className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                    {chatMode === 'direct' && selectedDMConv
                      ? selectedDMConv.other_user_name
                      : chatMode === 'groups' && selectedCustomGroup
                      ? selectedCustomGroup.group_name
                      : groups.find(g => g.id === selectedGroup)?.name || t('chat')}
                  </CardTitle>
                  {chatMode === 'groups' && selectedCustomGroup && (
                    <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {selectedCustomGroup.members.length} members
                    </Badge>
                  )}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] flex flex-col">
                {/* Reply indicator */}
                {replyingTo && (
                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-700 dark:text-blue-400">Replying to {replyingTo.sender_name}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{replyingTo.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReplyingTo(null)}
                      className="text-slate-500 dark:text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-[#1e1e1e]">
                  {isLoading && <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading messages...</div>}
                  {!isLoading && filteredMessages.length === 0 && !searchTerm && <div className="text-center text-slate-500 dark:text-slate-400 py-8">No messages yet. Start the conversation!</div>}
                  {!isLoading && filteredMessages.length === 0 && searchTerm && <div className="text-center text-slate-500 dark:text-slate-400 py-8">No messages found matching "{searchTerm}"</div>}
                  
                  {filteredMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMe={msg.sender_email === user?.email}
                      onReply={setReplyingTo}
                      onReaction={handleReaction}
                      userEmail={user?.email}
                      onUserClick={openUserProfile}
                    />
                  ))}
                  
                  <TypingIndicator users={typingUsers} />
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#282828]">
                  <div className="flex gap-2 items-end">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => document.getElementById('image-upload').click()}
                        disabled={uploadingImage}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#3B9FF3] dark:text-blue-400"
                        title="Upload image"
                      >
                        <Image className="w-5 h-5" />
                      </Button>

                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => document.getElementById('file-upload').click()}
                        disabled={uploadingFile}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#3B9FF3] dark:text-blue-400"
                        title="Upload file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#3B9FF3] dark:text-blue-400"
                            title="Emojis & GIFs"
                          >
                            <Smile className="w-5 h-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 p-0">
                          <Tabs defaultValue="emojis">
                            <TabsList className="w-full bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                              <TabsTrigger value="emojis" className="flex-1 data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">Emojis</TabsTrigger>
                              <TabsTrigger value="gifs" className="flex-1 data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">GIFs</TabsTrigger>
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
                    </div>

                    <MentionInput
                      value={message}
                      onChange={handleTyping}
                      onSubmit={handleSend}
                      employees={employees}
                      placeholder={replyingTo ? `Reply to ${replyingTo.sender_name}...` : t('typeMessage')}
                      className="h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    <Button 
                      type="submit" 
                      disabled={!message.trim() || sendMutation.isPending} 
                      className="h-12 bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Direct Message Dialog */}
        <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Start Direct Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {employees
                .filter(emp => emp.email !== user?.email)
                .map(emp => (
                  <button
                    key={emp.email}
                    onClick={() => startDirectMessage(emp)}
                    className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {emp.full_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900 dark:text-white">{emp.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position || emp.email}</p>
                    </div>
                  </button>
                ))}
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
        />

        {/* User Profile Modal */}
        <UserProfileModal
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
          userEmail={selectedProfileEmail}
          currentUserEmail={user?.email}
          isCurrentUser={selectedProfileEmail === user?.email}
        />
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  { value: 'blue', class: 'from-blue-500 to-blue-600' },
  { value: 'purple', class: 'from-purple-500 to-purple-600' },
  { value: 'green', class: 'from-green-500 to-green-600' },
  { value: 'orange', class: 'from-orange-500 to-orange-600' },
  { value: 'pink', class: 'from-pink-500 to-pink-600' },
  { value: 'teal', class: 'from-teal-500 to-teal-600' }
];