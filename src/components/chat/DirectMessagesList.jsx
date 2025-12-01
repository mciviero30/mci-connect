import React from 'react';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

export default function DirectMessagesList({ 
  conversations = [], 
  currentUserId, 
  onSelect,
  selectedId 
}) {
  return (
    <div className="space-y-2">
      {conversations.map(conv => {
        const otherUser = conv.participants.find(p => p !== currentUserId);
        const unreadCount = conv.unread_count || 0;
        
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${
              selectedId === conv.id
                ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{conv.other_user_name || otherUser}</p>
              {conv.last_message && (
                <p className={`text-xs truncate ${
                  selectedId === conv.id ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {conv.last_message}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </button>
        );
      })}
      
      {conversations.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No direct messages yet</p>
        </div>
      )}
    </div>
  );
}