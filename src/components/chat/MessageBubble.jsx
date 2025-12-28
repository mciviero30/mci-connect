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
            className="max-w-full max-h-96 rounded-2xl object-contain cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
            onClick={() => window.open(message.message, '_blank')}
          />
        );
      
      case 'gif':
        return (
          <img 
            src={message.message} 
            alt="" 
            className="max-w-full max-h-64 rounded-2xl object-contain shadow-lg"
          />
        );
      
      case 'file':
        const fileName = message.file_name || 'Document';
        return (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center gap-4 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] flex items-center justify-center shadow-md">
              <File className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">{fileName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'File'}
              </p>
            </div>
            <a href={message.message} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">
                <Download className="w-5 h-5" />
              </Button>
            </a>
          </div>
        );
      
      default:
        // Parse mentions
        const messageText = message.message.replace(/@(\w+(?:\s+\w+)*)/g, (match) => {
          return `<span class="bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg font-bold">${match}</span>`;
        });
        
        return (
          <p 
            className="break-words whitespace-pre-wrap font-medium"
            dangerouslySetInnerHTML={{ __html: messageText }}
          />
        );
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[70%] inline-block ${
        isMe 
          ? 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] text-white shadow-lg shadow-blue-500/20' 
          : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700/60 shadow-md'
      } rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300`}>
        {/* Reply reference */}
        {message.reply_to_message && (
          <div className={`px-4 pt-3 pb-2 border-l-4 ${
            isMe ? 'border-blue-200 bg-blue-500/10' : 'border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50'
          }`}>
            <p className={`text-xs font-semibold ${isMe ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
              Replying to {message.reply_to_sender_name}
            </p>
            <p className={`text-xs ${isMe ? 'text-blue-50' : 'text-slate-700 dark:text-slate-300'} truncate mt-1`}>
              {message.reply_to_message}
            </p>
          </div>
        )}

        {/* Sender name for others */}
        {!isMe && (
          <div className="px-4 pt-3 pb-1">
            <button 
              onClick={() => onUserClick?.(message.sender_email)}
              className="text-xs font-bold text-[#507DB4] dark:text-[#6B9DD8] hover:text-[#507DB4]/80 dark:hover:text-[#6B9DD8]/80 transition-colors cursor-pointer"
            >
              {message.sender_name}
            </button>
          </div>
        )}
        
        {/* Message content */}
        <div className="px-4 py-2.5 text-sm leading-relaxed">
          {renderContent()}
        </div>
        
        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {Object.entries(reactions).map(([reactionName, users]) => {
              const reaction = REACTIONS.find(r => r.name === reactionName);
              if (!reaction || users.length === 0) return null;
              
              const iReacted = users.includes(userEmail);
              
              return (
                <button
                  key={reactionName}
                  onClick={() => handleReaction(reactionName)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    iReacted
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-[#507DB4] dark:border-[#6B9DD8] scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-105 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-base">{reaction.emoji}</span>
                  <span className={isMe ? 'text-white' : 'text-slate-900 dark:text-white'}>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Timestamp and actions */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <p className={`text-xs font-medium ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {format(new Date(message.created_date), 'HH:mm')}
            {isMe && message.read_by && (
              <CheckCheck className="w-3.5 h-3.5 inline ml-1" />
            )}
          </p>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReactions(!showReactions)}
              className={`h-7 px-2 rounded-lg ${isMe ? 'text-white hover:bg-blue-600/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className={`h-7 px-2 rounded-lg ${isMe ? 'text-white hover:bg-blue-600/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Reply className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick reactions */}
        {showReactions && (
          <div className="px-4 pb-3 border-t border-slate-200/30 dark:border-slate-700/30 pt-3">
            <div className="flex gap-2 justify-center">
              {REACTIONS.map(reaction => (
                <button
                  key={reaction.name}
                  onClick={() => handleReaction(reaction.name)}
                  className="text-2xl p-2 hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
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