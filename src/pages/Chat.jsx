import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Send, Users, Image, Smile, Search,
  Paperclip, X, UserPlus, Hash, AtSign, Menu, MoreVertical,
  Loader2, WifiOff
} from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CreateGroupDialog from "../components/chat/CreateGroupDialog";
import UserProfileModal from "../components/chat/UserProfileModal";
import DirectMessagesList from "../components/chat/DirectMessagesList";
import MentionInput from "../components/chat/MentionInput";
import { useToast } from "@/components/ui/toast";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import OnlineStatusManager from "../components/chat/OnlineStatusManager";
import { StreamChat } from "stream-chat";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇",
  "🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞",
  "👍","👎","👊","✊","🤞","✌️","🤘","👌","💪","🙏","🔥","💥","⭐","✨"
];

const EmojiPicker = ({ onSelect }) => (
  <div className="grid grid-cols-8 gap-1 p-3 max-h-64 overflow-y-auto">
    {EMOJIS.map((emoji, idx) => (
      <button key={idx} onClick={() => onSelect(emoji)}
        className="text-xl hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors active:scale-95">
        {emoji}
      </button>
    ))}
  </div>
);

const MessageBubble = ({ msg, currentUserId, onReply, onDelete }) => {
  const isMe = msg.user?.id === currentUserId;
  const [showActions, setShowActions] = useState(false);
  return (
    <div className={`flex gap-2 mb-2 ${isMe ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          {(msg.user?.name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!isMe && <span className="text-[9px] font-semibold text-slate-500 px-1">{msg.user?.name || msg.user?.id}</span>}
        {msg.quoted_message && (
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1 text-[9px] text-slate-500 border-l-2 border-[#507DB4] mb-0.5">
            <span className="font-semibold">{msg.quoted_message.user?.name}</span>: {msg.quoted_message.text?.substring(0, 60)}
          </div>
        )}
        <div className={`relative group rounded-2xl px-3 py-2 text-xs shadow-sm ${
          isMe ? "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] text-white rounded-tr-sm"
               : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm border border-slate-100 dark:border-slate-700"
        }`}>
          {msg.attachments?.length > 0 && msg.attachments[0].type === "image" ? (
            <img src={msg.attachments[0].image_url || msg.attachments[0].thumb_url} alt="img"
              className="max-w-[200px] rounded-lg" />
          ) : msg.attachments?.length > 0 && msg.attachments[0].type === "file" ? (
            <a href={msg.attachments[0].asset_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 underline">
              <Paperclip className="w-3 h-3" />{msg.attachments[0].title || "Archivo"}
            </a>
          ) : (
            <span className="whitespace-pre-wrap break-words">{msg.text}</span>
          )}
          {showActions && (
            <div className={`absolute top-0 ${isMe ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex gap-0.5 bg-white dark:bg-slate-700 rounded-lg shadow-md border border-slate-100 dark:border-slate-600 px-1 py-0.5 z-10`}>
              <button onClick={() => onReply(msg)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-[9px] text-slate-600 dark:text-slate-300">↩</button>
              {isMe && <button onClick={() => onDelete(msg.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[9px] text-red-500">✕</button>}
            </div>
          )}
        </div>
        <span className="text-[8px] text-slate-400 px-1">
          {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
        </span>
      </div>
    </div>
  );
};

export default function Chat() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [streamClient, setStreamClient] = useState(null);
  const [streamChannel, setStreamChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamUserId, setStreamUserId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [chatMode, setChatMode] = useState("channels");
  const [selectedGroup, setSelectedGroup] = useState("general");
  const [selectedDMConv, setSelectedDMConv] = useState(null);
  const [selectedCustomGroup, setSelectedCustomGroup] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-chat"],
    queryFn: () => base44.entities.Job.filter({ status: "active" }, "-created_date", 100),
    staleTime: 300000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-chat"],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: "active" }, "full_name", 200),
    staleTime: 300000,
  });

  const { data: customGroups = [] } = useQuery({
    queryKey: ["chatGroups-stream"],
    queryFn: () => base44.entities.ChatGroup.list("-created_date"),
    staleTime: 60000,
  });

  // Connect to Stream Chat
  useEffect(() => {
    let client = null;
    const connect = async () => {
      setIsConnecting(true);
      setConnectionError(null);
      try {
        const res = await base44.functions.streamChatToken();
        if (res.error) throw new Error(res.error);
        const { token, userId, apiKey, userName, userImage } = res;
        setStreamUserId(userId);
        client = StreamChat.getInstance(apiKey);
        await client.connectUser(
          { id: userId, name: userName, image: userImage || undefined },
          token
        );
        setStreamClient(client);
      } catch (err) {
        console.error("Stream connect error:", err);
        setConnectionError(err.message);
      } finally {
        setIsConnecting(false);
      }
    };
    connect();
    return () => {
      if (client) client.disconnectUser().catch(console.error);
    };
  }, []);

  // Get active channel ID
  const getChannelId = useCallback(() => {
    if (chatMode === "direct" && selectedDMConv) return `dm_${selectedDMConv.id}`;
    if (chatMode === "groups" && selectedCustomGroup) return `group_${selectedCustomGroup.id}`;
    return selectedGroup || "general";
  }, [chatMode, selectedDMConv, selectedCustomGroup, selectedGroup]);

  // Subscribe to channel
  useEffect(() => {
    if (!streamClient) return;
    let channel = null;
    const subscribe = async () => {
      try {
        const channelId = getChannelId().replace(/[^a-zA-Z0-9_-]/g, "_");
        let channelName = "General";
        if (chatMode === "channels") {
          const job = jobs.find(j => j.id === selectedGroup);
          channelName = job ? job.name : "General";
        } else if (chatMode === "groups" && selectedCustomGroup) {
          channelName = selectedCustomGroup.group_name;
        } else if (chatMode === "direct" && selectedDMConv) {
          channelName = selectedDMConv.other_user_name || "DM";
        }
        channel = streamClient.channel("messaging", channelId, { name: channelName });
        await channel.watch();
        const state = channel.state.messages || [];
        setMessages([...state]);
        setStreamChannel(channel);

        channel.on("message.new", (event) => {
          setMessages(prev => [...prev, event.message]);
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        channel.on("message.deleted", (event) => {
          setMessages(prev => prev.filter(m => m.id !== event.message.id));
        });
        channel.on("typing.start", (event) => {
          if (event.user?.id !== streamClient.userID) {
            setTypingUsers(prev => [...new Set([...prev, event.user?.name || event.user?.id])]);
          }
        });
        channel.on("typing.stop", (event) => {
          setTypingUsers(prev => prev.filter(u => u !== (event.user?.name || event.user?.id)));
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);
      } catch (err) {
        console.error("Channel subscribe error:", err);
      }
    };
    subscribe();
    return () => {
      if (channel) {
        channel.stopWatching().catch(console.error);
        setStreamChannel(null);
        setMessages([]);
      }
    };
  }, [streamClient, chatMode, selectedGroup, selectedDMConv, selectedCustomGroup]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || !streamChannel) return;
    const opts = {};
    if (replyingTo) opts.quoted_message_id = replyingTo.id;
    try {
      await streamChannel.sendMessage({ text: message.trim(), ...opts });
      setMessage("");
      setReplyingTo(null);
    } catch (err) {
      toast.toast({ title: "Error", description: "No se pudo enviar el mensaje", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e, type = "file") => {
    const file = e.target.files[0];
    if (!file || !streamChannel) return;
    setUploading(true);
    try {
      const response = type === "image"
        ? await streamChannel.sendImage(file)
        : await streamChannel.sendFile(file);
      await streamChannel.sendMessage({
        text: "",
        attachments: [{
          type: type,
          [type === "image" ? "image_url" : "asset_url"]: response.file,
          title: file.name,
        }]
      });
    } catch (err) {
      toast.toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (msgId) => {
    if (!streamClient) return;
    try { await streamClient.deleteMessage(msgId); } catch (err) { console.error(err); }
  };

  const handleTyping = () => {
    if (streamChannel) streamChannel.keystroke().catch(() => {});
  };

  const channels = [
    { id: "general", name: "General", icon: Hash },
    ...jobs.map(j => ({ id: j.id, name: j.name, icon: MessageSquare }))
  ];

  const currentChat = chatMode === "direct" && selectedDMConv
    ? { name: selectedDMConv.other_user_name, icon: AtSign }
    : chatMode === "groups" && selectedCustomGroup
    ? { name: selectedCustomGroup.group_name, icon: Users }
    : channels.find(g => g.id === selectedGroup) || { name: "Chat", icon: MessageSquare };

  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#507DB4]" />
        <p className="text-sm text-slate-500">Conectando al chat...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <WifiOff className="w-10 h-10 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">No se pudo conectar al chat</p>
        <p className="text-xs text-slate-500 text-center">{connectionError}</p>
        <Button onClick={() => window.location.reload()} size="sm">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden" style={{ height: "calc(100dvh - 3.5rem - 4rem)" }}>
      <OnlineStatusManager userEmail={currentUser?.email} />

      {/* Header */}
      <div className="flex-shrink-0 h-12 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] flex items-center px-2 gap-1.5 shadow-md z-10">
        <button onClick={() => setShowSidebar(!showSidebar)}
          className="md:hidden p-1 hover:bg-white/20 rounded-lg transition-colors active:scale-95">
          <Menu className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {currentChat.icon && <currentChat.icon className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-semibold text-white truncate">{currentChat.name}</h1>
            <p className="text-[8px] text-white/80">
              {streamClient ? "● En línea — Stream Chat" : "Conectando..."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar Backdrop */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black/60 md:hidden z-40" onClick={() => setShowSidebar(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed md:relative w-[280px] flex flex-col bg-white dark:bg-slate-800
          transition-transform duration-300 ease-out z-50 md:z-auto shadow-xl md:shadow-none
          ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:border-r md:border-slate-200 md:dark:border-slate-700
          md:h-full h-[calc(100vh-3.5rem-3.5rem)]`}>

          {/* Sidebar Header */}
          <div className="flex-shrink-0 h-11 px-2 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white">Mensajes</h2>
            <div className="flex gap-0.5">
              <button onClick={() => { setShowCreateGroup(true); setShowSidebar(false); }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <Users className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => { setShowNewDM(true); setShowSidebar(false); }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <UserPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex-shrink-0 p-2 bg-slate-50 dark:bg-slate-900">
            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
              {[["channels", Hash, "Canales"], ["groups", Users, "Grupos"], ["direct", AtSign, "DMs"]].map(([mode, Icon, label]) => (
                <button key={mode} onClick={() => setChatMode(mode)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-semibold transition-all ${
                    chatMode === mode
                      ? "bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}>
                  <Icon className="w-3 h-3 inline mr-1" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto">
            {chatMode === "channels" && channels.map(ch => {
              const Icon = ch.icon;
              const isActive = selectedGroup === ch.id;
              return (
                <button key={ch.id}
                  onClick={() => { setSelectedGroup(ch.id); setSelectedDMConv(null); setSelectedCustomGroup(null); setShowSidebar(false); }}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                    isActive ? "bg-[#507DB4]/10" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isActive ? "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]" : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{ch.name}</p>
                    <p className="text-[9px] text-slate-500">Canal de equipo</p>
                  </div>
                </button>
              );
            })}

            {chatMode === "groups" && customGroups.filter(g => g.is_active && g.members?.includes(currentUser?.email)).map(group => {
              const isActive = selectedCustomGroup?.id === group.id;
              return (
                <button key={group.id}
                  onClick={() => { setChatMode("groups"); setSelectedCustomGroup(group); setSelectedDMConv(null); setShowSidebar(false); }}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                    isActive ? "bg-[#507DB4]/10" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? "bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]" : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{group.group_name}</p>
                    <p className="text-[9px] text-slate-500">{group.members?.length || 0} miembros</p>
                  </div>
                </button>
              );
            })}

            {chatMode === "direct" && (
              <DirectMessagesList
                conversations={[]}
                currentUserId={currentUser?.email}
                onSelect={(conv) => { setSelectedDMConv(conv); setSelectedCustomGroup(null); setShowSidebar(false); }}
                selectedId={selectedDMConv?.id}
              />
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-3 pb-24">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">¡Inicia la conversación!</h3>
                  <p className="text-xs text-slate-500">Envía un mensaje para empezar</p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                currentUserId={streamUserId}
                onReply={setReplyingTo}
                onDelete={handleDelete}
              />
            ))}
            {typingUsers.length > 0 && (
              <div className="text-[9px] text-slate-400 italic px-2 pb-1">
                {typingUsers.join(", ")} está escribiendo...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            {replyingTo && (
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-blue-600">Respondiendo a {replyingTo.user?.name}</p>
                  <p className="text-[10px] text-slate-600 truncate">{replyingTo.text?.substring(0, 60)}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-100 rounded">
                  <X className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="px-3 py-2">
              <div className="flex gap-1.5 items-end">
                <input type="file" accept="image/*" ref={imageInputRef}
                  onChange={(e) => handleFileUpload(e, "image")} className="hidden" />
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0">
                  <Image className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>

                <input type="file" ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, "file")} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0">
                  <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <MentionInput
                    value={message}
                    onChange={setMessage}
                    onSubmit={handleSend}
                    onKeyUp={handleTyping}
                    employees={employees}
                    placeholder="Escribe un mensaje"
                    className="bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-0 px-3 py-2"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0">
                      <Smile className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" side="top" align="end">
                    <EmojiPicker onSelect={(emoji) => setMessage(prev => prev + emoji)} />
                  </PopoverContent>
                </Popover>

                <button type="submit"
                  disabled={!message.trim() || !streamChannel || uploading}
                  className="p-2 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] text-white rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-40 flex-shrink-0 active:scale-95">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupDialog
          onClose={() => setShowCreateGroup(false)}
          employees={employees}
          currentUser={currentUser}
          onCreated={(group) => {
            setChatMode("groups");
            setSelectedCustomGroup(group);
            setShowCreateGroup(false);
          }}
        />
      )}
    </div>
  );
}
