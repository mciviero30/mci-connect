import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  File, 
  Download, 
  Reply, 
  ThumbsUp, 
  Heart, 
  Smile,
  CheckCheck
} from 'lucide-react';

const REACTIONS = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '😮', name: 'wow' },
  { emoji: '👏', name: 'clap' },
  { emoji: '🎉', name: 'celebrate' }
];

export default function MessageBubble({ 
  message, 
  isMe, 
  onReply, 
  onReaction,
  userEmail,
  onUserClick 
}) {
  const [showReactions, setShowReactions] = useState(false);
  const msgType = message.message_type || 'text';
  const reactions = message.reactions || {};
  
  const handleReaction = (reactionName) => {
    onReaction(message.id, reactionName);
    setShowReactions(false);
  };

  const renderContent = () => {
    switch (msgType) {
      case 'image':
        return (
          <img 
            src={message.message} 
            alt="" 
            className="max-w-full max-h-96 rounded-lg object-contain cursor-pointer"
            onClick={() => window.open(message.message, '_blank')}
          />
        );
      
      case 'gif':
        return (
          <img 
            src={message.message} 
            alt="" 
            className="max-w-full max-h-64 rounded-lg object-contain"
          />
        );
      
      case 'file':
        const fileName = message.file_name || 'Document';
        return (
          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center gap-3">
            <File className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">{fileName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'File'}
              </p>
            </div>
            <a href={message.message} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          </div>
        );
      
      default:
        // Parse mentions
        const messageText = message.message.replace(/@(\w+(?:\s+\w+)*)/g, (match) => {
          return `<span class="bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1 rounded font-semibold">${match}</span>`;
        });
        
        return (
          <p 
            className="break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: messageText }}
          />
        );
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[65%] ${
        isMe 
          ? 'bg-[#3B9FF3] text-white' 
          : 'bg-white dark:bg-[#282828] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
      } rounded-xl shadow-md overflow-hidden`}>
        {/* Reply reference */}
        {message.reply_to_message && (
          <div className={`px-2 pt-1 pb-0.5 border-l-2 ${
            isMe ? 'border-blue-200 bg-blue-500/20' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
          }`}>
            <p className={`text-[9px] ${isMe ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
              Replying to {message.reply_to_sender_name}
            </p>
            <p className={`text-[10px] ${isMe ? 'text-blue-50' : 'text-slate-700 dark:text-slate-300'} truncate`}>
              {message.reply_to_message}
            </p>
          </div>
        )}

        {/* Sender name for others */}
        {!isMe && (
          <div className="px-2 pt-1.5 pb-0">
            <button 
              onClick={() => onUserClick?.(message.sender_email)}
              className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 hover:text-[#3B9FF3] dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {message.sender_name}
            </button>
          </div>
        )}
        
        {/* Message content */}
        <div className="px-2 py-1 text-[13px] leading-snug">
          {renderContent()}
        </div>
        
        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="px-2 pb-0.5 flex flex-wrap gap-0.5">
            {Object.entries(reactions).map(([reactionName, users]) => {
              const reaction = REACTIONS.find(r => r.name === reactionName);
              if (!reaction || users.length === 0) return null;
              
              const iReacted = users.includes(userEmail);
              
              return (
                <button
                  key={reactionName}
                  onClick={() => handleReaction(reactionName)}
                  className={`px-1 py-0.5 rounded-full text-[9px] flex items-center gap-0.5 transition-all ${
                    iReacted
                      ? 'bg-blue-500/30 border border-blue-400'
                      : 'bg-slate-200 dark:bg-slate-700 border border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-[10px]">{reaction.emoji}</span>
                  <span className={isMe ? 'text-white' : 'text-slate-900 dark:text-white'}>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Timestamp and actions */}
        <div className="px-2 pb-1 flex items-center justify-between">
          <p className={`text-[9px] ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {format(new Date(message.created_date), 'HH:mm')}
            {isMe && message.read_by && (
              <CheckCheck className="w-2.5 h-2.5 inline ml-0.5" />
            )}
          </p>
          
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReactions(!showReactions)}
              className={`h-5 px-0.5 ${isMe ? 'text-white hover:bg-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Smile className="w-2.5 h-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className={`h-5 px-0.5 ${isMe ? 'text-white hover:bg-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Reply className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>

        {/* Quick reactions */}
        {showReactions && (
          <div className="px-2 pb-1">
            <div className="flex gap-0.5">
              {REACTIONS.map(reaction => (
                <button
                  key={reaction.name}
                  onClick={() => handleReaction(reaction.name)}
                  className="text-sm p-0.5 hover:scale-110 transition-transform"
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}