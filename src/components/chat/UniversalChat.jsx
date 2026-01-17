import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, Paperclip, Smile, Search, X, Download, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UniversalMessageBubble from './UniversalMessageBubble';
import TypingIndicator from './TypingIndicator';
import MentionInput from './MentionInput';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '👍', '👎', '👊', '✊', '🤞', '✌️', '🤟', '🤘', '👌', '👏', '🙏',
  '🔥', '💥', '⭐', '🌟', '✨', '⚡', '💫', '☄️', '💯', '🎉', '🎊', '🎈', '🎁'
];

const GifSearch = ({ onSelect, language }) => {
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
    const timeout = setTimeout(() => searchGifs(search), 500);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder={language === 'es' ? 'Buscar GIFs...' : 'Search GIFs...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {loading && <div className="col-span-2 text-center py-8 text-slate-500">Loading...</div>}
        {!loading && gifs.length === 0 && search && (
          <div className="col-span-2 text-center py-8 text-slate-500">No GIFs found</div>
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

export default function UniversalChat({
  groupId,
  channelName = 'Chat',
  employees = [],
  currentUser,
  filterQuery = {},
  language = 'en',
  showSearch = true,
  showExport = true,
  headerActions = null,
  onMessageSent = null,
  className = '',
  isDark = false
}) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const typingTimeoutRef = useRef(null);

  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [viewDensity, setViewDensity] = useState('normal'); // 'compact', 'normal', 'comfortable'

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['universal-chat', groupId, filterQuery],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      group_id: groupId,
      ...filterQuery 
    }, 'created_date'),
    refetchInterval: 3000,
    enabled: !!groupId,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ['universal-chat', groupId] });
      queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
      setMessage('');
      setReplyingTo(null);
      setEditingMessage(null);
      onMessageSent?.(newMessage);
      toast.success(language === 'es' ? 'Mensaje enviado' : 'Message sent');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-chat', groupId] });
      setEditingMessage(null);
      setMessage('');
      toast.success(language === 'es' ? 'Mensaje actualizado' : 'Message updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatMessage.update(id, { 
      message: language === 'es' ? '[Mensaje eliminado]' : '[Message deleted]',
      is_deleted: true 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-chat', groupId] });
      toast.success(language === 'es' ? 'Mensaje eliminado' : 'Message deleted');
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, reaction }) => {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg?.reactions || {};
      const reactionUsers = reactions[reaction] || [];
      
      const newReactionUsers = reactionUsers.includes(currentUser.email)
        ? reactionUsers.filter(email => email !== currentUser.email)
        : [...reactionUsers, currentUser.email];
      
      return base44.entities.ChatMessage.update(messageId, {
        reactions: {
          ...reactions,
          [reaction]: newReactionUsers
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-chat', groupId] });
    }
  });

  const handleSend = (e, content = null, type = 'text', fileName = null, fileSize = null) => {
    if (e) e.preventDefault();
    const messageContent = content || message.trim();
    if (!messageContent) return;

    const messageData = {
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      message: messageContent,
      message_type: type,
      group_id: groupId,
      file_name: fileName,
      file_size: fileSize
    };

    if (replyingTo) {
      messageData.reply_to_message_id = replyingTo.id;
      messageData.reply_to_message = replyingTo.message?.substring(0, 100);
      messageData.reply_to_sender_name = replyingTo.sender_name;
    }

    if (editingMessage) {
      updateMutation.mutate({ id: editingMessage.id, data: { message: messageContent } });
    } else {
      sendMutation.mutate(messageData);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'image', file.name, file.size);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(language === 'es' ? 'Error subiendo imagen' : 'Error uploading image');
    }
    setUploadingImage(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleSend(null, file_url, 'file', file.name, file.size);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(language === 'es' ? 'Error subiendo archivo' : 'Error uploading file');
    }
    setUploadingFile(false);
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(message + emoji);
  };

  const handleGifSelect = (gifUrl) => {
    handleSend(null, gifUrl, 'gif');
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg);
    setMessage(msg.message);
  };

  const handleDelete = (msgId) => {
    if (window.confirm(language === 'es' ? '¿Eliminar mensaje?' : 'Delete message?')) {
      deleteMutation.mutate(msgId);
    }
  };

  const handleExport = () => {
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
    a.download = `chat_${groupId}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark messages as read
    if (messages.length > 0 && currentUser) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_email !== currentUser.email && 
        (!msg.read_by || !msg.read_by.includes(currentUser.email))
      );
      
      unreadMessages.forEach(msg => {
        const readBy = msg.read_by || [];
        if (!readBy.includes(currentUser.email)) {
          base44.entities.ChatMessage.update(msg.id, {
            read_by: [...readBy, currentUser.email]
          }).catch(() => {});
        }
      });
    }
  }, [messages, currentUser]);

  const filteredMessages = searchTerm 
    ? messages.filter(m => 
        m.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  return (
    <div className={`flex flex-col h-full ${className} ${isDark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-gradient-to-br from-orange-600 to-yellow-500' : 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]'} flex items-center justify-center shadow-lg`}>
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {channelName}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {messages.length} {language === 'es' ? 'mensajes' : 'messages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSearch && (
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <Input
                  placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-64 pl-10 h-9 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
            )}
            
            {showExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600'}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {headerActions}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto px-6 py-4 space-y-${viewDensity === 'compact' ? '2' : viewDensity === 'comfortable' ? '5' : '3'} ${isDark ? 'bg-slate-900' : 'bg-slate-50/50'}`}>
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'es' ? 'Cargando mensajes...' : 'Loading messages...'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && filteredMessages.length === 0 && !searchTerm && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <MessageSquare className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? '¡Inicia la conversación!' : 'Start the conversation!'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && filteredMessages.length === 0 && searchTerm && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {language === 'es' ? 'No se encontraron mensajes' : 'No messages found'}
              </p>
            </div>
          </div>
        )}

        {filteredMessages.map((msg) => (
          <UniversalMessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.sender_email === currentUser?.email}
            onReply={setReplyingTo}
            onReaction={(msgId, reaction) => reactionMutation.mutate({ messageId: msgId, reaction })}
            onEdit={handleEdit}
            onDelete={handleDelete}
            userEmail={currentUser?.email}
            language={language}
            isDark={isDark}
            density={viewDensity}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Indicator */}
      {replyingTo && (
        <div className={`px-6 py-3 border-b flex items-center justify-between ${isDark ? 'bg-blue-950/30 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {language === 'es' ? 'Respondiendo a' : 'Replying to'} {replyingTo.sender_name}
            </p>
            <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {replyingTo.message}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReplyingTo(null)}
            className={isDark ? 'text-slate-400' : 'text-slate-500'}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Editing Indicator */}
      {editingMessage && (
        <div className={`px-6 py-3 border-b flex items-center justify-between ${isDark ? 'bg-yellow-950/30 border-yellow-900/30' : 'bg-yellow-50 border-yellow-100'}`}>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              {language === 'es' ? 'Editando mensaje' : 'Editing message'}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingMessage(null);
              setMessage('');
            }}
            className={isDark ? 'text-slate-400' : 'text-slate-500'}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSend} className={`px-6 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
        <div className="flex gap-2 items-end">
          <div className="flex gap-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="universal-image-upload"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById('universal-image-upload').click()}
              disabled={uploadingImage}
              className={`h-10 w-10 rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Image className="w-5 h-5" />
            </Button>

            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="universal-file-upload"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById('universal-file-upload').click()}
              disabled={uploadingFile}
              className={`h-10 w-10 rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <Tabs defaultValue="emojis">
                  <TabsList className="w-full">
                    <TabsTrigger value="emojis" className="flex-1">Emojis</TabsTrigger>
                    <TabsTrigger value="gifs" className="flex-1">GIFs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="emojis" className="m-0">
                    <div className="grid grid-cols-8 gap-2 p-4 max-h-64 overflow-y-auto">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-2xl hover:bg-slate-100 p-2 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="gifs" className="m-0">
                    <GifSearch onSelect={handleGifSelect} language={language} />
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>
          </div>

          <MentionInput
            value={message}
            onChange={setMessage}
            onSubmit={handleSend}
            employees={employees}
            placeholder={
              editingMessage 
                ? (language === 'es' ? 'Editar mensaje...' : 'Edit message...') 
                : replyingTo 
                ? `${language === 'es' ? 'Responder a' : 'Reply to'} ${replyingTo.sender_name}...` 
                : (language === 'es' ? 'Escribe un mensaje...' : 'Write a message...')
            }
            className={`h-10 rounded-xl ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
          />

          <Button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending || updateMutation.isPending}
            className={`h-10 px-6 rounded-xl shadow-lg ${isDark ? 'bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black' : 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white'}`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'es' ? 'Exportar Conversación' : 'Export Conversation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              {language === 'es' 
                ? `Se exportarán ${filteredMessages.length} mensajes en formato CSV`
                : `${filteredMessages.length} messages will be exported as CSV`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
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