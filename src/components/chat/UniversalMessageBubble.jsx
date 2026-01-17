import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  File, 
  Download, 
  Reply, 
  CheckCheck,
  Smile,
  Edit2,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const REACTIONS = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '😮', name: 'wow' },
  { emoji: '👏', name: 'clap' },
  { emoji: '🎉', name: 'celebrate' }
];

export default function UniversalMessageBubble({ 
  message, 
  isMe, 
  onReply, 
  onReaction,
  onEdit,
  onDelete,
  userEmail,
  language = 'en',
  isDark = false,
  density = 'normal'
}) {
  const [showReactions, setShowReactions] = useState(false);
  const msgType = message.message_type || 'text';
  const reactions = message.reactions || {};
  const isDeleted = message.is_deleted || false;
  
  const handleReaction = (reactionName) => {
    onReaction(message.id, reactionName);
    setShowReactions(false);
  };

  const renderContent = () => {
    if (isDeleted) {
      return (
        <p className={`italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {message.message}
        </p>
      );
    }

    switch (msgType) {
      case 'image':
        return (
          <img 
            src={message.message} 
            alt="" 
            className="max-w-full max-h-96 rounded-xl object-contain cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => window.open(message.message, '_blank')}
          />
        );
      
      case 'gif':
        return (
          <img 
            src={message.message} 
            alt="" 
            className="max-w-full max-h-64 rounded-xl object-contain"
          />
        );
      
      case 'file':
        const fileName = message.file_name || 'Document';
        return (
          <div className={`p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-orange-600 to-yellow-500' : 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8]'}`}>
              <File className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {fileName}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'File'}
              </p>
            </div>
            <a href={message.message} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 w-8">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          </div>
        );
      
      default:
        const messageText = message.message?.replace(/@(\w+(?:\s+\w+)*)/g, (match) => {
          return `<span class="${isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/20 text-blue-700'} px-2 py-0.5 rounded-lg font-bold">${match}</span>`;
        });
        
        return (
          <p 
            className="break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: messageText }}
          />
        );
    }
  };

  const paddingClass = density === 'compact' ? 'p-2' : density === 'comfortable' ? 'p-4' : 'p-3';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] inline-block rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all ${
        isMe 
          ? (isDark ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-black' : 'bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] text-white')
          : (isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white text-slate-900 border border-slate-200')
      }`}>
        {/* Reply reference */}
        {message.reply_to_message && (
          <div className={`px-3 pt-2 pb-1 border-l-4 ${
            isMe 
              ? (isDark ? 'border-yellow-400 bg-yellow-500/10' : 'border-blue-200 bg-blue-500/10')
              : (isDark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-300 bg-slate-100/50')
          }`}>
            <p className={`text-xs font-semibold ${isMe ? (isDark ? 'text-yellow-200' : 'text-blue-100') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
              {language === 'es' ? 'Respondiendo a' : 'Replying to'} {message.reply_to_sender_name}
            </p>
            <p className={`text-xs truncate ${isMe ? (isDark ? 'text-yellow-100' : 'text-blue-50') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
              {message.reply_to_message}
            </p>
          </div>
        )}

        {/* Sender name */}
        {!isMe && (
          <div className={`px-3 pt-2 pb-1`}>
            <span className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-[#507DB4]'}`}>
              {message.sender_name}
            </span>
            {message.is_client && (
              <Badge className="ml-2 bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">
                Client
              </Badge>
            )}
          </div>
        )}
        
        {/* Message content */}
        <div className={`${paddingClass} text-sm`}>
          {renderContent()}
        </div>
        
        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {Object.entries(reactions).map(([reactionName, users]) => {
              const reaction = REACTIONS.find(r => r.name === reactionName);
              if (!reaction || users.length === 0) return null;
              
              const iReacted = users.includes(userEmail);
              
              return (
                <button
                  key={reactionName}
                  onClick={() => handleReaction(reactionName)}
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                    iReacted
                      ? (isDark ? 'bg-blue-500/30 border-2 border-blue-400' : 'bg-blue-100 border-2 border-[#507DB4]')
                      : (isDark ? 'bg-slate-700 border border-slate-600' : 'bg-slate-100 border border-slate-200')
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Footer - timestamp and actions */}
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className={`text-xs ${isMe ? (isDark ? 'text-yellow-200' : 'text-blue-100') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
            {format(new Date(message.created_date), 'HH:mm')}
            {isMe && message.read_by && message.read_by.length > 1 && (
              <CheckCheck className="w-3 h-3 inline ml-1" />
            )}
            {message.updated_date && message.updated_date !== message.created_date && (
              <span className="ml-1 italic">({language === 'es' ? 'editado' : 'edited'})</span>
            )}
          </p>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReactions(!showReactions)}
              className={`h-6 px-1.5 rounded-lg ${isMe ? (isDark ? 'text-yellow-200 hover:bg-yellow-600/30' : 'text-white hover:bg-blue-600/50') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')}`}
            >
              <Smile className="w-3.5 h-3.5" />
            </Button>
            
            {!isDeleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(message)}
                className={`h-6 px-1.5 rounded-lg ${isMe ? (isDark ? 'text-yellow-200 hover:bg-yellow-600/30' : 'text-white hover:bg-blue-600/50') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')}`}
              >
                <Reply className="w-3.5 h-3.5" />
              </Button>
            )}

            {isMe && !isDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-1.5 rounded-lg ${isDark ? 'text-yellow-200 hover:bg-yellow-600/30' : 'text-white hover:bg-blue-600/50'}`}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Editar' : 'Edit'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Eliminar' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Quick reactions */}
        {showReactions && (
          <div className={`px-3 pb-2 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/30'} pt-2`}>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {REACTIONS.map(reaction => (
                <button
                  key={reaction.name}
                  onClick={() => handleReaction(reaction.name)}
                  className={`text-xl p-1.5 hover:scale-125 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
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