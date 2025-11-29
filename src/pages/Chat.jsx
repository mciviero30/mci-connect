import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Users, Image, Smile, Search } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [message, setMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', selectedGroup],
    queryFn: () => base44.entities.ChatMessage.filter({ group_id: selectedGroup }, 'created_date'),
    initialData: [],
    refetchInterval: 5000, // Changed from 3000 to 5000ms
    staleTime: 3000, // Add stale time
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    staleTime: 60000, // Cache for 1 minute
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedGroup] });
      setMessage('');
    }
  });

  const handleSend = (e, content = null, type = 'text') => {
    if (e) e.preventDefault();
    const messageContent = content || message.trim();
    if (!messageContent) return;

    sendMutation.mutate({
      sender_email: user.email,
      sender_name: user.full_name,
      message: messageContent,
      message_type: type,
      group_id: selectedGroup
    });
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        />

        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-lg text-slate-900 dark:text-white">{t('channels')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {groups.map(group => {
                  const Icon = group.icon;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${
                        selectedGroup === group.id
                          ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium truncate">{group.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="w-5 h-5 text-[#3B9FF3]" />
                {groups.find(g => g.id === selectedGroup)?.name || t('chat')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-[#1e1e1e]">
                  {isLoading && <div className="text-center text-slate-500 dark:text-slate-400 py-8">Loading messages...</div>}
                  {!isLoading && messages.length === 0 && <div className="text-center text-slate-500 dark:text-slate-400 py-8">No messages yet.</div>}
                  {messages.map((msg) => {
                    const isMe = msg.sender_email === user?.email;
                    const msgType = msg.message_type || 'text';
                    
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMe ? 'bg-[#3B9FF3] text-white' : 'bg-white dark:bg-[#282828] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'} rounded-2xl shadow-lg overflow-hidden`}>
                          {!isMe && (
                            <div className="px-4 pt-3 pb-1">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{msg.sender_name}</p>
                            </div>
                          )}
                          
                          {msgType === 'image' || msgType === 'gif' ? (
                            <img src={msg.message} alt="" className="max-w-full max-h-64 object-contain" />
                          ) : (
                            <div className="px-4 py-3">
                              <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          )}
                          
                          <div className="px-4 pb-2">
                            <p className={`text-xs ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {format(new Date(msg.created_date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#3B9FF3]"
                      >
                        <Image className="w-5 h-5" />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#3B9FF3]"
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

                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('typeMessage')}
                      className="flex-1 h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400"
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
      </div>
    </div>
  );
}